import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRequire = createRequire(path.resolve(here, '../../backend/package.json'));
backendRequire('dotenv').config({ path: path.resolve(here, '../../backend/.env') });
const mongoose = backendRequire('mongoose');
const bcrypt = backendRequire('bcryptjs');

const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const email = `e2e-doctor-${suffix}@example.com`;
const adminEmail = `e2e-admin-${suffix}@example.com`;
const password = 'E2E-Test-Password-2026!';
const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const Admin = mongoose.models.E2EAdmin ?? mongoose.model('E2EAdmin', new mongoose.Schema({
  email: { type: String, unique: true }, passwordHash: String,
  role: { type: String, default: 'admin' }, isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
}, { collection: 'admins' }));
const Doctor = mongoose.models.E2EDoctor ?? mongoose.model('E2EDoctor', new mongoose.Schema({}, {
  strict: false, collection: 'doctors',
}));

let browser;
let adminId;
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const admin = await Admin.create({
    email: adminEmail,
    passwordHash: await bcrypt.hash(password, 4),
    role: 'admin',
    isActive: true,
  });
  adminId = admin._id;

  browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) failures.push(message.text()); });

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email address').fill(adminEmail);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/');
  await page.goto(`${baseUrl}/doctors`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Doctors', exact: true }).waitFor();

  await page.getByRole('button', { name: 'Add doctor' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('First name').fill('E2E');
  await dialog.getByLabel('Last name').fill('Automation');
  await dialog.getByLabel('Email address').fill(email);
  await dialog.getByLabel('Phone number').fill('+8801700000099');
  await dialog.getByLabel('Specialty').fill('Cardiology');
  await dialog.getByLabel('Medical license number').fill(`E2E-${suffix}`);
  await dialog.getByLabel('Years of experience').fill('9');
  await dialog.getByLabel('Consultation fee (BDT)').fill('1700');
  await dialog.getByRole('button', { name: 'Add doctor' }).click();

  const row = page.getByRole('row').filter({ hasText: email });
  await row.waitFor();
  if (!(await row.getByText('Dr. E2E Automation').count())) throw new Error('Created doctor was not rendered in the table.');
  const persisted = await Doctor.findOne({ email }).lean();
  if (!persisted) throw new Error('Created doctor was not persisted to MongoDB.');

  await page.getByPlaceholder('Search doctors...').fill(email);
  await row.waitFor();
  await row.locator('button').last().click();
  await page.getByRole('menuitem', { name: 'Edit doctor' }).click();
  const editDialog = page.getByRole('dialog');
  await editDialog.getByLabel('Specialty').fill('Neurology');
  await editDialog.getByRole('button', { name: 'Save changes' }).click();
  await page.getByText('Neurology').first().waitFor();
  const updated = await Doctor.findOne({ email }).lean();
  if (updated?.specialty !== 'Neurology') throw new Error('Edit did not persist to MongoDB.');

  const updatedRow = page.getByRole('row').filter({ hasText: email });
  await updatedRow.locator('button').last().click();
  await page.getByRole('menuitem', { name: 'Delete doctor' }).click();
  const deleteResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'DELETE' && response.url().includes('/api/v1/doctors/'));
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete doctor' }).click();
  const deleteResponse = await deleteResponsePromise;
  if (!deleteResponse.ok()) throw new Error(`Delete API failed: ${deleteResponse.status()} ${await deleteResponse.text()}`);
  await updatedRow.waitFor({ state: 'detached' });
  let remaining = await Doctor.findOne({ email }).lean();
  for (let attempt = 0; remaining && attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    remaining = await Doctor.findOne({ email }).lean();
  }
  if (remaining) throw new Error(`Delete API returned success but MongoDB still contains doctor ${remaining._id}.`);
  if (failures.length) throw new Error(`Browser console/runtime errors: ${failures.join(' | ')}`);

  console.log('E2E PASS: admin login → protected doctors page → create → persisted → search → edit → persisted → delete → removed.');
} finally {
  if (browser) await browser.close();
  if (mongoose.connection.readyState) {
    await Doctor.deleteMany({ email }).catch(() => undefined);
    if (adminId) await Admin.deleteOne({ _id: adminId }).catch(() => undefined);
    await mongoose.disconnect();
  }
}
