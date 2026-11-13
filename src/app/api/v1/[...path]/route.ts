import type { NextRequest } from "next/server";

const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "content-type",
  "cookie",
  "origin",
  "user-agent",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-request-id",
  "x-vercel-id",
] as const;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function getUpstreamBaseUrl(): string {
  const configuredUrl = process.env.API_INTERNAL_URL;
  if (!configuredUrl && process.env.NODE_ENV === "production") {
    throw new Error("API_INTERNAL_URL must be configured in production.");
  }

  return (configuredUrl ?? "http://localhost:4000/api/v1").replace(/\/+$/, "");
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;
  const upstreamUrl = new URL(
    `${getUpstreamBaseUrl()}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`,
  );

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD"
    ? undefined
    : await request.arrayBuffer();

  const upstreamResponse = await fetch(upstreamUrl, {
    method,
    headers,
    body,
    cache: "no-store",
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, name) => {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase()) && name.toLowerCase() !== "set-cookie") {
      responseHeaders.set(name, value);
    }
  });

  // Preserve every Set-Cookie header independently (notably login and logout).
  for (const cookie of upstreamResponse.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", cookie);
  }

  const responseBody = method === "HEAD" || upstreamResponse.status === 204 || upstreamResponse.status === 304
    ? null
    : await upstreamResponse.arrayBuffer();

  return new Response(responseBody, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
