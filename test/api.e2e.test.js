import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "../src/app.js";
import { User } from "../src/models/user.models.js";
import { Project } from "../src/models/project.models.js";
import { ProjectMember } from "../src/models/projectmember.models.js";
import { Task } from "../src/models/task.models.js";
import { TaskComment } from "../src/models/taskcomment.models.js";
import { Notification } from "../src/models/notification.models.js";
import { Activity } from "../src/models/activity.models.js";
import { Subtask } from "../src/models/subtask.models.js";
import { ProjectNote } from "../src/models/note.models.js";

dotenv.config({ path: ".env" });

const testDatabaseUri = process.env.TEST_MONGO_URI;
const suffix = `api_test_${Date.now()}`;
const userIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
let server;
let baseUrl;
let admin;
let member;
let unverifiedUser;
let adminToken;
let memberToken;
let projectId;
let taskId;

const request = async (path, { method = "GET", token, body } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  return { status: response.status, body: await response.json() };
};

before(async () => {
  if (!testDatabaseUri) {
    throw new Error("TEST_MONGO_URI is required. Use a separate test database, not MONGO_URI.");
  }
  if (testDatabaseUri === process.env.MONGO_URI) {
    throw new Error("TEST_MONGO_URI must be different from MONGO_URI to protect your main data.");
  }

  await mongoose.connect(testDatabaseUri);
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  [admin, member, unverifiedUser] = await User.create([
    {
      _id: userIds[0],
      username: `${suffix}_admin`,
      email: `${suffix}_admin@example.com`,
      fullName: "API Test Admin",
      password: "TestPassword123!",
      isEmailVerified: true,
    },
    {
      _id: userIds[1],
      username: `${suffix}_member`,
      email: `${suffix}_member@example.com`,
      fullName: "API Test Member",
      password: "TestPassword123!",
      isEmailVerified: true,
    },
    {
      _id: userIds[2],
      username: `${suffix}_unverified`,
      email: `${suffix}_unverified@example.com`,
      fullName: "API Test Unverified User",
      password: "TestPassword123!",
      isEmailVerified: false,
    },
  ]);

  const adminLogin = await request("/auth/login", {
    method: "POST",
    body: { email: admin.email, password: "TestPassword123!" },
  });
  const memberLogin = await request("/auth/login", {
    method: "POST",
    body: { email: member.email, password: "TestPassword123!" },
  });
  assert.equal(adminLogin.status, 200);
  assert.equal(memberLogin.status, 200);
  adminToken = adminLogin.body.data.accessToken;
  memberToken = memberLogin.body.data.accessToken;
});

after(async () => {
  const cleanup = [
    Notification.deleteMany({ recipient: { $in: userIds } }),
    User.deleteMany({ _id: { $in: userIds } }),
  ];

  if (projectId) {
    cleanup.push(
      Notification.deleteMany({ project: projectId }),
      TaskComment.deleteMany({ task: taskId }),
      Subtask.deleteMany({ task: taskId }),
      Task.deleteMany({ project: projectId }),
      ProjectNote.deleteMany({ project: projectId }),
      ProjectMember.deleteMany({ project: projectId }),
      Activity.deleteMany({ project: projectId }),
      Project.deleteOne({ _id: projectId }),
    );
  }

  await Promise.all(cleanup);
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
});

test("health check is public", async () => {
  const response = await request("/healthcheck");
  assert.equal(response.status, 200);
});

test("unverified users cannot log in", async () => {
  const response = await request("/auth/login", {
    method: "POST",
    body: { email: unverifiedUser.email, password: "TestPassword123!" },
  });
  assert.equal(response.status, 403);
  assert.match(response.body.message, /verify your email/i);
});

test("project admin can create a project and add a member", async () => {
  const createProject = await request("/projects", {
    method: "POST",
    token: adminToken,
    body: { name: suffix, description: "Temporary automated API test project" },
  });
  assert.equal(createProject.status, 201);
  projectId = createProject.body.data._id;

  const addMember = await request(`/projects/${projectId}/members`, {
    method: "POST",
    token: adminToken,
    body: { email: member.email, role: "member" },
  });
  assert.equal(addMember.status, 201);
});

test("members cannot create tasks", async () => {
  const response = await request(`/tasks/${projectId}`, {
    method: "POST",
    token: memberToken,
    body: { title: "Member should not create this" },
  });
  assert.equal(response.status, 403);
});

test("task priority and due-date summary work", async () => {
  const dueDate = new Date();
  dueDate.setHours(12, 0, 0, 0);
  const createTask = await request(`/tasks/${projectId}`, {
    method: "POST",
    token: adminToken,
    body: {
      title: "Priority task",
      assignedTo: member._id,
      status: "todo",
      difficulty: "medium",
      priority: "high",
      dueDate: dueDate.toISOString(),
    },
  });
  assert.equal(createTask.status, 201);
  assert.equal(createTask.body.data.priority, "high");
  taskId = createTask.body.data._id;

  const dueSummary = await request(`/tasks/${projectId}/due-summary`, { token: memberToken });
  assert.equal(dueSummary.status, 200);
  assert.equal(dueSummary.body.data.counts.dueToday, 1);

  const updateTask = await request(`/tasks/${projectId}/t/${taskId}`, {
    method: "PUT",
    token: adminToken,
    body: { priority: "low" },
  });
  assert.equal(updateTask.status, 200);
  assert.equal(updateTask.body.data.priority, "low");
});

test("comments, activity, and notifications are stored for the right users", async () => {
  const notifications = await request("/notifications", { token: memberToken });
  assert.equal(notifications.status, 200);
  assert.ok(notifications.body.data.some((item) => item.type === "project_member_added"));
  assert.ok(notifications.body.data.some((item) => item.type === "task_assigned"));

  const comment = await request(`/tasks/${projectId}/t/${taskId}/comments`, {
    method: "POST",
    token: memberToken,
    body: { content: `Please review this @${admin.username}` },
  });
  assert.equal(comment.status, 201);

  const adminNotifications = await request("/notifications", { token: adminToken });
  const mention = adminNotifications.body.data.find((item) => item.type === "comment_mention");
  assert.ok(mention);

  const markRead = await request(`/notifications/${mention._id}/read`, {
    method: "PATCH",
    token: adminToken,
  });
  assert.equal(markRead.status, 200);
  assert.equal(markRead.body.data.isRead, true);

  const forbiddenRead = await request(`/notifications/${mention._id}/read`, {
    method: "PATCH",
    token: memberToken,
  });
  assert.equal(forbiddenRead.status, 404);

  const activity = await request(`/projects/${projectId}/activity`, { token: memberToken });
  assert.equal(activity.status, 200);
  assert.ok(activity.body.data.some((item) => item.type === "task_created"));
});
