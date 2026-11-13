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
  await page.screenshot({ path: "docs/screenshots/doctors-desktop.png", fullPage: true });

  // Shared shell state: command navigation, persisted desktop preference, and mobile drawer.
  await page.keyboard.press("Control+k");
  const commandDialog = page.getByRole("dialog");
  const commandInput = commandDialog.getByRole("textbox", { name: "Search workspace pages" });
  await commandInput.fill("patients");
  await commandInput.press("Enter");
  await page.waitForURL("**/patients");
  await page.goto(`${baseUrl}/doctors`, { waitUntil: "networkidle" });
  await page.keyboard.press("Control+k");
  const createDoctorCommand = page.getByRole("dialog");
  await createDoctorCommand.getByRole("textbox", { name: "Search workspace pages" }).fill("add doctor");
  await createDoctorCommand.getByRole("link", { name: /Add doctor/ }).click();
  await page.waitForURL("**/doctors");
  await page.getByLabel("First name").waitFor();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Expand sidebar" }).waitFor();
  await page.getByRole("button", { name: "Expand sidebar" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  const mobileNavigation = page.getByRole("dialog");
  await mobileNavigation.getByRole("link", { name: "Patients" }).click();
  await page.waitForURL("**/patients");
  await mobileNavigation.waitFor({ state: "hidden" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseUrl}/doctors`, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Add doctor" }).first().click();
  await page.screenshot({ path: "docs/screenshots/doctor-form-desktop.png", fullPage: true });
  await page.getByLabel("First name").fill("E2E");
  await page.getByLabel("Last name").fill("Automation");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Phone number").fill("+8801700000099");
  await page.getByLabel("Specialty").fill("Cardiology");
  await page.getByLabel("Hospital").fill("E2E City Hospital");
  await page.getByLabel("Medical license number").fill(`E2E-${suffix}`);
  await page.getByLabel("Years of experience").fill("9");
  await page.getByLabel("Consultation fee (BDT)").fill("1700");
  await page.getByRole("button", { name: "Add doctor" }).click();

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
  await page.getByLabel("Specialty").fill("Neurology");
  await page.getByRole("button", { name: "Save changes" }).click();
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
  const patientDoctorEmail = `e2e-patient-doctor-${suffix}@example.com`;
  const patientDoctorResponse = await page.request.post("http://localhost:4000/api/v1/doctors", {
    data: {
      firstName: "Patient", lastName: "CareDoctor", email: patientDoctorEmail,
      phone: "+8801700000066", specialty: "Pediatrics", licenseNumber: `E2E-PD-${suffix}`,
      yearsOfExperience: 6, consultationFee: 900, status: "active",
    },
  });
  if (!patientDoctorResponse.ok()) throw new Error(`Could not create E2E patient doctor: ${await patientDoctorResponse.text()}`);

  await page.goto(`${baseUrl}/patients`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Patients", exact: true }).waitFor();
  await page.screenshot({ path: "docs/screenshots/patients-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Add patient" }).first().click();
  await page.screenshot({ path: "docs/screenshots/patient-form-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  console.log("PATIENT MOBILE GEOMETRY", await page.evaluate(() => ({ innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, rootFontSize: getComputedStyle(document.documentElement).fontSize, lg: matchMedia("(min-width: 64rem)").matches, mainPadding: getComputedStyle(document.querySelector("main")).paddingLeft, wrapperPadding: getComputedStyle(document.querySelector("main").parentElement).paddingLeft, wrapperRect: document.querySelector("main").parentElement.getBoundingClientRect().toJSON(), main: document.querySelector("main")?.getBoundingClientRect().toJSON(), root: document.querySelector("#__next")?.getBoundingClientRect().toJSON() })));
  await page.screenshot({ path: "docs/screenshots/patient-form-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel("First name").fill("Browser");
  await page.getByLabel("Last name").fill("Patient");
  await page.getByLabel("Date of birth").fill("1991-06-15");
  await page.getByLabel("Phone number").fill("+8801700000088");
  await page.getByLabel("Email address").fill(patientEmail);
  await page.locator("#patient-assigned-doctor").waitFor({ state: "visible" });
  await page.waitForFunction(() => !document.querySelector("#patient-assigned-doctor")?.hasAttribute("disabled"));
  await page.locator("#patient-assigned-doctor").click();
  const assignedDoctorPicker = page.getByRole("combobox", { name: "Search doctors by name or specialty…" });
  await assignedDoctorPicker.fill("Patient CareDoctor");
  await page.getByRole("option", { name: /Patient CareDoctor/ }).first().click();
  await page.getByRole("button", { name: "Add patient" }).click();

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
  await page.getByLabel("Last name").fill("Updated");
  await page.getByRole("button", { name: "Save changes" }).click();
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
      hospital: "E2E General Hospital",
      workingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: "09:00", endTime: "18:00" })),
      consultationFee: 1000, status: "active",
    },
  });
  if (!appointmentDoctorResponse.ok()) throw new Error(`Could not create E2E appointment doctor: ${await appointmentDoctorResponse.text()}`);
  const appointmentDoctor = (await appointmentDoctorResponse.json()).data.doctor;
  await page.goto(`${baseUrl}/appointments`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Appointment desk", exact: true }).waitFor();
  await page.screenshot({ path: "docs/screenshots/appointment-desk-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/screenshots/appointment-desk-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("tab", { name: "Upcoming" }).click();
  await page.getByRole("button", { name: "Book appointment" }).first().click();
  await page.screenshot({ path: "docs/screenshots/appointment-form-desktop.png", fullPage: true });
  await page.getByLabel("Patient phone or patient number").fill("+8801700000088");
  await page.getByRole("button", { name: "Choose the matching patient…" }).click();
  const patientPicker = page.getByRole("combobox", { name: "Search patient name or number…" });
  await patientPicker.fill("Browser Updated");
  await page.getByRole("option", { name: /Browser Updated/ }).click();
  await page.getByRole("button", { name: "Select a doctor…" }).click();
  const doctorPicker = page.getByRole("combobox", { name: "Search by doctor name or specialty…" });
  await doctorPicker.fill("Schedule Doctor");
  await page.getByRole("option", { name: /Schedule Doctor/ }).first().click();
  const appointmentDate = new Date(Date.now() + 4 * 86_400_000);
  appointmentDate.setHours(10, 0, 0, 0);
  const localDateTime = new Date(appointmentDate.getTime() - appointmentDate.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  await page.locator("#appointment-start").fill(localDateTime);
  await page.getByRole("button", { name: /10:00/ }).click();
  await page.locator("#appointment-reason").fill("E2E consultation");
  const bookingResponsePromise = page.waitForResponse(response => response.request().method() === "POST" && response.url().includes("/api/v1/appointments"));
  await page.getByRole("button", { name: "Confirm booking" }).click();
  const bookingResponse = await bookingResponsePromise;
  if (!bookingResponse.ok()) throw new Error(`Appointment booking failed (${bookingResponse.status()}): ${await bookingResponse.text()}`);
  await page.getByPlaceholder("Patient name, phone, ID or reason…").fill("Browser Updated");
  const appointmentRow = page.getByRole("row").filter({ hasText: "Browser Updated" });
  await appointmentRow.waitFor();
  const appointmentRecord = (await Appointment.find({}).lean()).find((item) => String(item.doctor) === appointmentDoctor.id && String(item.patient) === patientId);
  if (!appointmentRecord) throw new Error("Appointment did not persist to MongoDB.");
  const duplicateResponse = await page.request.post("http://localhost:4000/api/v1/appointments", {
    data: { patientId, doctorId: appointmentDoctor.id, startAt: new Date(`${localDateTime}:00+06:00`).toISOString(), durationMinutes: 30 },
  });
  if (duplicateResponse.status() !== 409) throw new Error("Overlapping appointment was not rejected.");
  await appointmentRow.locator("button").nth(1).click();
  await page.getByLabel("Reason for visit").fill("Updated E2E consultation");
  await page.getByRole("button", { name: "Save appointment" }).click();
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
  await appointmentRow.locator("button").nth(2).click();
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
  await page.screenshot({ path: "docs/screenshots/dashboard-desktop.png", fullPage: true });
  const dashboardRefresh = await dashboardRefreshPromise;
  if (!dashboardRefresh.ok())
    throw new Error("Dashboard did not refresh after patient deletion.");
  if (await page.getByText("Browser Patient").count())
    throw new Error("Deleted patient still appears in the live dashboard.");

  if (failures.length)
    throw new Error(`Browser console/runtime errors: ${failures.join(" | ")}`);

  console.log(
    "E2E PASS: administrator login → command palette and navigation → persisted sidebar preference → mobile navigation → doctor CRUD → searchable patient doctor assignment → patient CRUD → receptionist-first phone lookup and patient registration entry → doctor hours and appointment booking → scheduling conflict/status/delete → live dashboard → MongoDB persistence checks.",
  );
} finally {
  if (browser) await browser.close();
  if (mongoose.connection.readyState) {
    await Doctor.deleteMany({ email }).catch(() => undefined);
    await Doctor.deleteMany({ email: /^e2e-patient-doctor-/ }).catch(() => undefined);
    const appointmentDoctors = await Doctor.find({ email: /^e2e-appointment-doctor-/ }).select("_id").lean();
    if (appointmentDoctors.length) await Appointment.deleteMany({ doctor: { $in: appointmentDoctors.map((doctor) => doctor._id) } }).catch(() => undefined);
    await Doctor.deleteMany({ email: /^e2e-appointment-doctor-/ }).catch(() => undefined);
    await Patient.deleteMany({ email: patientEmail }).catch(() => undefined);
    if (adminId) await Admin.deleteOne({ _id: adminId }).catch(() => undefined);
    await mongoose.disconnect();
  }
}
