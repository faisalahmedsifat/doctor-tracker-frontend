import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRequire = createRequire(
  path.resolve(here, "../../backend/package.json"),
);
backendRequire("dotenv").config({
  path: path.resolve(here, "../../backend/.env"),
});
const mongoose = backendRequire("mongoose");
const bcrypt = backendRequire("bcryptjs");

const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const email = `e2e-doctor-${suffix}@example.com`;
const patientEmail = `e2e-patient-${suffix}@example.com`;
const adminEmail = `e2e-admin-${suffix}@example.com`;
const password = "E2E-Test-Password-2026!";
const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const Admin =
  mongoose.models.E2EAdmin ??
  mongoose.model(
    "E2EAdmin",
    new mongoose.Schema(
      {
        email: { type: String, unique: true },
        passwordHash: String,
        role: { type: String, default: "admin" },
        isActive: { type: Boolean, default: true },
        lastLoginAt: Date,
      },
      { collection: "admins" },
    ),
  );
const Doctor =
  mongoose.models.E2EDoctor ??
  mongoose.model(
    "E2EDoctor",
    new mongoose.Schema(
      {},
      {
        strict: false,
        collection: "doctors",
      },
    ),
  );
const Patient =
  mongoose.models.E2EPatient ??
  mongoose.model(
    "E2EPatient",
    new mongoose.Schema(
      {},
      {
        strict: false,
        collection: "patients",
      },
    ),
  );
const Appointment =
  mongoose.models.E2EAppointment ??
  mongoose.model("E2EAppointment", new mongoose.Schema({}, { strict: false, collection: "appointments" }));

let browser;
let adminId;
try {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  const admin = await Admin.create({
    email: adminEmail,
    passwordHash: await bcrypt.hash(password, 4),
    role: "admin",
    isActive: true,
  });
  adminId = admin._id;

  browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("Failed to load resource")
    )
      failures.push(message.text());
  });

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill(adminEmail);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/");
  await page.goto(`${baseUrl}/doctors`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Doctors", exact: true }).waitFor();

  await page.getByRole("button", { name: "Add doctor" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("First name").fill("E2E");
  await dialog.getByLabel("Last name").fill("Automation");
  await dialog.getByLabel("Email address").fill(email);
  await dialog.getByLabel("Phone number").fill("+8801700000099");
  await dialog.getByLabel("Specialty").fill("Cardiology");
  await dialog.getByLabel("Medical license number").fill(`E2E-${suffix}`);
  await dialog.getByLabel("Years of experience").fill("9");
  await dialog.getByLabel("Consultation fee (BDT)").fill("1700");
  await dialog.getByRole("button", { name: "Add doctor" }).click();

  const row = page.getByRole("row").filter({ hasText: email });
  await row.waitFor();
  if (!(await row.getByText("Dr. E2E Automation").count()))
    throw new Error("Created doctor was not rendered in the table.");
  const persisted = await Doctor.findOne({ email }).lean();
  if (!persisted)
    throw new Error("Created doctor was not persisted to MongoDB.");

  await page.getByPlaceholder("Search doctors...").fill(email);
  await row.waitFor();
  await row.locator("button").last().click();
  await page.getByRole("menuitem", { name: "Edit doctor" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Specialty").fill("Neurology");
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await page.getByText("Neurology").first().waitFor();
  const updated = await Doctor.findOne({ email }).lean();
  if (updated?.specialty !== "Neurology")
    throw new Error("Edit did not persist to MongoDB.");

  const updatedRow = page.getByRole("row").filter({ hasText: email });
  await updatedRow.locator("button").last().click();
  await page.getByRole("menuitem", { name: "Delete doctor" }).click();
  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "DELETE" &&
      response.url().includes("/api/v1/doctors/"),
  );
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete doctor" })
    .click();
  const deleteResponse = await deleteResponsePromise;
  if (!deleteResponse.ok())
    throw new Error(
      `Delete API failed: ${deleteResponse.status()} ${await deleteResponse.text()}`,
    );
  await updatedRow.waitFor({ state: "detached" });
  let remaining = await Doctor.findOne({ email }).lean();
  for (let attempt = 0; remaining && attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    remaining = await Doctor.findOne({ email }).lean();
  }
  if (remaining)
    throw new Error(
      `Delete API returned success but MongoDB still contains doctor ${remaining._id}.`,
    );
  await page.goto(`${baseUrl}/patients`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Patients", exact: true }).waitFor();
  await page.getByRole("button", { name: "Add patient" }).first().click();
  const patientDialog = page.getByRole("dialog");
  await patientDialog.getByLabel("First name").fill("Browser");
  await patientDialog.getByLabel("Last name").fill("Patient");
  await patientDialog.getByLabel("Date of birth").fill("1991-06-15");
  await patientDialog.getByLabel("Phone number").fill("+8801700000088");
  await patientDialog.getByLabel("Email address").fill(patientEmail);
  await patientDialog.getByRole("button", { name: "Add patient" }).click();

  let patientRow = page.getByRole("row").filter({ hasText: patientEmail });
  await patientRow.waitFor();
  const patientRecord = await Patient.findOne({ email: patientEmail }).lean();
  if (!patientRecord)
    throw new Error("Patient create did not persist to MongoDB.");
  const patientId = patientRecord._id.toString();

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Overview", exact: true }).waitFor();
  await page.getByText("Browser Patient").waitFor();
  await page.getByText("Live database records").waitFor();
  const dashboardResponse = await page.request.get("http://localhost:4000/api/v1/dashboard/overview", {
    headers: { cookie: await page.context().cookies().then((cookies) => cookies.map((item) => `${item.name}=${item.value}`).join("; ")) },
  });
  if (!dashboardResponse.ok()) throw new Error(`Dashboard API failed: ${dashboardResponse.status()}`);
  const dashboardPayload = await dashboardResponse.json();
  if (!dashboardPayload.data.recentPatients.some((item) => item.id === patientId))
    throw new Error("Dashboard API did not include the newly created patient.");

  await page.goto(`${baseUrl}/patients`, { waitUntil: "networkidle" });
  patientRow = page.getByRole("row").filter({ hasText: patientEmail });
  await patientRow.waitFor();
  await patientRow.locator("button").last().click();
  await page.getByRole("menuitem", { name: "Edit patient" }).click();
  const editPatientDialog = page.getByRole("dialog");
  await editPatientDialog.getByLabel("Last name").fill("Updated");
  await editPatientDialog.getByRole("button", { name: "Save changes" }).click();
  await page.getByText("Browser Updated").waitFor();
  const updatedPatient = await Patient.findById(patientId).lean();
  if (updatedPatient?.lastName !== "Updated")
    throw new Error("Patient edit did not persist to MongoDB.");


  const appointmentDoctorEmail = `e2e-appointment-doctor-${suffix}@example.com`;
  const appointmentDoctorResponse = await page.request.post("http://localhost:4000/api/v1/doctors", {
    data: {
      firstName: "Schedule", lastName: "Doctor", email: appointmentDoctorEmail,
      phone: "+8801700000077", specialty: "General Medicine",
      licenseNumber: `E2E-AP-${suffix}`, yearsOfExperience: 7,
      consultationFee: 1000, status: "active",
    },
  });
  if (!appointmentDoctorResponse.ok()) throw new Error(`Could not create E2E appointment doctor: ${await appointmentDoctorResponse.text()}`);
  const appointmentDoctor = (await appointmentDoctorResponse.json()).data.doctor;
  await page.goto(`${baseUrl}/appointments`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Appointments", exact: true }).waitFor();
  await page.getByRole("button", { name: "Schedule appointment" }).first().click();
  const appointmentDialog = page.getByRole("dialog");
  await appointmentDialog.locator("#appointment-patient").selectOption(patientId);
  await appointmentDialog.locator("#appointment-doctor").selectOption(appointmentDoctor.id);
  const appointmentDate = new Date(Date.now() + 4 * 86_400_000);
  appointmentDate.setHours(10, 0, 0, 0);
  const localDateTime = new Date(appointmentDate.getTime() - appointmentDate.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  await appointmentDialog.locator("#appointment-start").fill(localDateTime);
  await appointmentDialog.locator("#appointment-reason").fill("E2E consultation");
  await appointmentDialog.getByRole("button", { name: "Schedule appointment" }).click();
  const appointmentRow = page.getByRole("row").filter({ hasText: "Browser Updated" });
  await appointmentRow.waitFor();
  const appointmentRecord = (await Appointment.find({}).lean()).find((item) => String(item.doctor) === appointmentDoctor.id && String(item.patient) === patientId);
  if (!appointmentRecord) throw new Error("Appointment did not persist to MongoDB.");
  const duplicateResponse = await page.request.post("http://localhost:4000/api/v1/appointments", {
    data: { patientId, doctorId: appointmentDoctor.id, startAt: appointmentDate.toISOString(), durationMinutes: 30 },
  });
  if (duplicateResponse.status() !== 409) throw new Error("Overlapping appointment was not rejected.");
  await appointmentRow.getByRole("button", { name: /Edit appointment for/ }).click();
  const editAppointmentDialog = page.getByRole("dialog");
  await editAppointmentDialog.getByLabel("Reason for visit").fill("Updated E2E consultation");
  await editAppointmentDialog.getByRole("button", { name: "Save changes" }).click();
  let editedAppointment = await Appointment.findById(appointmentRecord._id).lean();
  for (let attempt = 0; editedAppointment?.reason !== "Updated E2E consultation" && attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    editedAppointment = await Appointment.findById(appointmentRecord._id).lean();
  }
  if (editedAppointment?.reason !== "Updated E2E consultation") throw new Error("Appointment edit did not persist.");
  await appointmentRow.getByRole("combobox").click();
  await page.getByRole("option", { name: "Confirmed" }).click();
  let updatedAppointment = await Appointment.findById(appointmentRecord._id).lean();
  for (let attempt = 0; updatedAppointment?.status !== "confirmed" && attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    updatedAppointment = await Appointment.findById(appointmentRecord._id).lean();
  }
  if (updatedAppointment?.status !== "confirmed") throw new Error("Appointment status update did not persist.");
  await appointmentRow.getByRole("button", { name: /Delete appointment for/ }).click();
  const deleteAppointmentResponsePromise = page.waitForResponse(
    (response) => response.request().method() === "DELETE" && response.url().includes("/api/v1/appointments/"),
  );
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete appointment" }).click();
  const deleteAppointmentResponse = await deleteAppointmentResponsePromise;
  if (!deleteAppointmentResponse.ok()) throw new Error(`Appointment delete API failed: ${deleteAppointmentResponse.status()}`);
  await appointmentRow.waitFor({ state: "detached" });
  let deletedAppointment = await Appointment.findById(appointmentRecord._id).lean();
  for (let attempt = 0; deletedAppointment && attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    deletedAppointment = await Appointment.findById(appointmentRecord._id).lean();
  }
  if (deletedAppointment) throw new Error("Appointment deletion did not persist.");
  await Appointment.deleteMany({ doctor: appointmentDoctor.id }).catch(() => undefined);
  await Doctor.deleteOne({ _id: appointmentDoctor.id }).catch(() => undefined);

  await page.goto(`${baseUrl}/patients`, { waitUntil: "networkidle" });
  patientRow = page.getByRole("row").filter({ hasText: patientEmail });
  await patientRow.locator("button").last().click();
  await page.getByRole("menuitem", { name: "Delete patient" }).click();
  const deletePatientResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "DELETE" &&
      response.url().includes("/api/v1/patients/"),
  );
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete patient" })
    .click();
  const deletePatientResponse = await deletePatientResponsePromise;
  if (!deletePatientResponse.ok())
    throw new Error(
      `Patient delete API failed: ${deletePatientResponse.status()}`,
    );
  await patientRow.waitFor({ state: "detached" });
  if (await Patient.findById(patientId).lean())
    throw new Error("Patient delete did not remove the MongoDB record.");

  const dashboardRefreshPromise = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/v1/dashboard/overview"),
  );
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const dashboardRefresh = await dashboardRefreshPromise;
  if (!dashboardRefresh.ok())
    throw new Error("Dashboard did not refresh after patient deletion.");
  if (await page.getByText("Browser Patient").count())
    throw new Error("Deleted patient still appears in the live dashboard.");

  if (failures.length)
    throw new Error(`Browser console/runtime errors: ${failures.join(" | ")}`);

  console.log(
    "E2E PASS: administrator login → doctor CRUD → patient CRUD → appointment scheduling/conflict/status/delete → live dashboard → MongoDB persistence checks.",
  );
} finally {
  if (browser) await browser.close();
  if (mongoose.connection.readyState) {
    await Doctor.deleteMany({ email }).catch(() => undefined);
    const appointmentDoctors = await Doctor.find({ email: /^e2e-appointment-doctor-/ }).select("_id").lean();
    if (appointmentDoctors.length) await Appointment.deleteMany({ doctor: { $in: appointmentDoctors.map((doctor) => doctor._id) } }).catch(() => undefined);
    await Doctor.deleteMany({ email: /^e2e-appointment-doctor-/ }).catch(() => undefined);
    await Patient.deleteMany({ email: patientEmail }).catch(() => undefined);
    if (adminId) await Admin.deleteOne({ _id: adminId }).catch(() => undefined);
    await mongoose.disconnect();
  }
}
