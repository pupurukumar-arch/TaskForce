import { expect, test } from "@playwright/test";
import crypto from "crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../../src/models/user.models.js";
import { Project } from "../../src/models/project.models.js";
import { ProjectMember } from "../../src/models/projectmember.models.js";
import { Task } from "../../src/models/task.models.js";
import { Notification } from "../../src/models/notification.models.js";
import { Activity } from "../../src/models/activity.models.js";
import { assertSeparateTestDatabase } from "../../src/db/index.js";

dotenv.config({ path: ".env", quiet: true });

const suffix = `browser_${Date.now()}`;
const adminEmail = `${suffix}_admin@example.com`;
const memberEmail = `${suffix}_member@example.com`;
const password = "BrowserTest123!";
const verificationToken = crypto.randomBytes(20).toString("hex");
let adminId;
let memberId;
let projectId;
let taskId;

test.beforeAll(async () => {
  assertSeparateTestDatabase(process.env.TEST_MONGO_URI, process.env.MONGO_URI);

  await mongoose.connect(process.env.TEST_MONGO_URI);
});

test.afterAll(async () => {
  const taskFilter = taskId ? { _id: taskId } : { project: projectId };
  await Promise.all([
    Notification.deleteMany({
      $or: [
        { recipient: { $in: [adminId, memberId].filter(Boolean) } },
        { project: projectId },
        { task: taskId },
      ],
    }),
    Activity.deleteMany({ project: projectId }),
    Task.deleteMany(taskFilter),
    ProjectMember.deleteMany({ project: projectId }),
    Project.deleteMany({ _id: projectId }),
    User.deleteMany({ email: { $in: [adminEmail, memberEmail] } }),
  ]);
  await mongoose.disconnect();
});

test("registered user can verify, create work, attach evidence, submit it, and approve it", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel(/^username/i).fill(`${suffix}admin`);
  await page.getByLabel(/^email/i).fill(adminEmail);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/account created/i)).toBeVisible();

  await expect
    .poll(async () => User.exists({ email: adminEmail }))
    .not.toBeNull();
  const admin = await User.findOne({ email: adminEmail }).lean();
  adminId = admin._id;
  await User.updateOne(
    { _id: adminId },
    {
      emailVerificationToken: crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex"),
      emailVerificationExpiry: new Date(Date.now() + 10 * 60 * 1000),
    },
  );
  const verificationState = await User.findById(adminId).lean();
  expect(verificationState.emailVerificationToken).toBe(
    crypto.createHash("sha256").update(verificationToken).digest("hex"),
  );

  await page.goto(`/verify-email/${verificationToken}`);
  await expect(
    page.getByRole("heading", { name: "Email verified" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Go to sign in" }).click();
  await page.getByLabel(/^email/i).fill(adminEmail);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: /keep your work moving/i }),
  ).toBeVisible();

  const member = await User.create({
    email: memberEmail,
    username: `${suffix}member`,
    fullName: "Browser Member",
    password,
    isEmailVerified: true,
  });
  memberId = member._id;

  await page.getByRole("button", { name: "+ New project" }).click();
  await page.getByLabel(/project name/i).fill("Browser workflow project");
  await page
    .getByLabel(/description/i)
    .fill("A browser-tested project workflow.");
  await page.getByRole("button", { name: "Create project" }).last().click();
  await expect(page.getByText("Browser workflow project")).toBeVisible();
  projectId = (
    await Project.findOne({ name: "Browser workflow project" }).lean()
  )._id;

  await page.getByRole("link", { name: "Open project" }).click();
  await page.getByRole("link", { name: "Members" }).click();
  await page.getByLabel(/^email/i).fill(memberEmail);
  await page.getByRole("button", { name: "Add member" }).click();
  await expect(page.getByText("Member added.")).toBeVisible();
  await page.getByRole("link", { name: /back to project board/i }).click();

  await page.getByRole("button", { name: "+ New task" }).click();
  await page.getByLabel(/task title/i).fill("Browser workflow task");
  await page.getByLabel(/assign to/i).selectOption(memberId.toString());
  await page.getByRole("button", { name: "Create task" }).last().click();
  await expect.poll(async () => Task.findOne({ title: "Browser workflow task" }).lean()).not.toBeNull();
  taskId = (await Task.findOne({ title: "Browser workflow task" }).lean())._id;

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByLabel(/^email/i).fill(memberEmail);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Open project" }).click();
  await page.getByRole("button", { name: "To do" }).click();
  await page.getByRole("link", { name: "Browser workflow task" }).click();
  await page
    .getByLabel(/attachments/i)
    .setInputFiles({
      name: "evidence.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Completed in browser test."),
    });
  await expect(page.getByText("evidence.txt")).toBeVisible();
  await page.getByRole("button", { name: "Submit for Review" }).click();
  await expect(page.getByRole("button", { name: /^In review 1$/ })).toBeVisible();
  await expect
    .poll(async () => (await Task.findById(taskId).lean()).attachments.length)
    .toBe(1);

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByLabel(/^email/i).fill(adminEmail);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Open project" }).click();
  await page.getByRole("button", { name: "In review" }).click();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect
    .poll(async () => (await Task.findById(taskId).lean()).status)
    .toBe("done");
});
