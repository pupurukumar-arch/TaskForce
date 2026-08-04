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
import { ProjectInvite } from "../src/models/projectinvite.models.js";
import crypto from "crypto";

dotenv.config({ path: ".env" });

const testDatabaseUri = process.env.TEST_MONGO_URI;
const suffix = `api_test_${Date.now()}`;
const userIds = [
  new mongoose.Types.ObjectId(),
  new mongoose.Types.ObjectId(),
  new mongoose.Types.ObjectId(),
  new mongoose.Types.ObjectId(),
];
let server;
let baseUrl;
let admin;
let member;
let unverifiedUser;
let outsider;
let adminToken;
let memberToken;
let outsiderToken;
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

  [admin, member, unverifiedUser, outsider] = await User.create([
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
    {
      _id: userIds[3],
      username: `${suffix}_outsider`,
      email: `${suffix}_outsider@example.com`,
      fullName: "API Test Outsider",
      password: "TestPassword123!",
      isEmailVerified: true,
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
  const outsiderLogin = await request("/auth/login", {
    method: "POST",
    body: { email: outsider.email, password: "TestPassword123!" },
  });
  assert.equal(adminLogin.status, 200);
  assert.equal(memberLogin.status, 200);
  assert.equal(outsiderLogin.status, 200);
  adminToken = adminLogin.body.data.accessToken;
  memberToken = memberLogin.body.data.accessToken;
  outsiderToken = outsiderLogin.body.data.accessToken;
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
      ProjectInvite.deleteMany({ project: projectId }),
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

test("the last project Admin cannot be demoted or removed", async () => {
  const demoteLastAdmin = await request(`/projects/${projectId}/members/${admin._id}`, {
    method: "PUT",
    token: adminToken,
    body: { newRole: "member" },
  });
  assert.equal(demoteLastAdmin.status, 409);
  assert.match(demoteLastAdmin.body.message, /at least one Admin/i);

  const removeLastAdmin = await request(`/projects/${projectId}/members/${admin._id}`, {
    method: "DELETE",
    token: adminToken,
  });
  assert.equal(removeLastAdmin.status, 409);

  const adminMembership = await ProjectMember.findOne({
    project: projectId,
    user: admin._id,
  });
  assert.equal(adminMembership.role, "admin");
});

test("members cannot create tasks", async () => {
  const response = await request(`/tasks/${projectId}`, {
    method: "POST",
    token: memberToken,
    body: { title: "Member should not create this" },
  });
  assert.equal(response.status, 403);
});

test("non-members cannot view a project's members", async () => {
  const response = await request(`/projects/${projectId}/members`, {
    token: outsiderToken,
  });
  assert.equal(response.status, 400);
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

  const personalDeadlines = await request("/tasks/my-deadlines", { token: memberToken });
  assert.equal(personalDeadlines.status, 200);
  assert.equal(personalDeadlines.body.data.counts.dueToday, 1);
  assert.equal(personalDeadlines.body.data.dueToday[0].project.name, suffix);

  const personalCalendar = await request(`/tasks/my-calendar?month=${dueDate.toISOString().slice(0, 7)}`, { token: memberToken });
  assert.equal(personalCalendar.status, 200);
  assert.equal(personalCalendar.body.data.tasks.length, 1);
  assert.equal(personalCalendar.body.data.tasks[0].title, "Priority task");

  const updateTask = await request(`/tasks/${projectId}/t/${taskId}`, {
    method: "PUT",
    token: adminToken,
    body: { priority: "low" },
  });
  assert.equal(updateTask.status, 200);
  assert.equal(updateTask.body.data.priority, "low");
});

test("a member submits an assigned task and an admin approves it", async () => {
  const submitForReview = await request(
    `/tasks/${projectId}/t/${taskId}/submit-review`,
    { method: "POST", token: memberToken },
  );
  assert.equal(submitForReview.status, 200);
  assert.equal(submitForReview.body.data.status, "in_review");
  assert.equal(submitForReview.body.data.submittedForReviewBy, member._id.toString());

  const approveTask = await request(`/tasks/${projectId}/t/${taskId}/review`, {
    method: "POST",
    token: adminToken,
    body: { approved: true },
  });
  assert.equal(approveTask.status, 200);
  assert.equal(approveTask.body.data.status, "done");
  assert.equal(approveTask.body.data.approvedBy, admin._id.toString());
});

test("project progress is role-aware", async () => {
  const managerProgress = await request(`/projects/${projectId}/progress`, { token: adminToken });
  assert.equal(managerProgress.status, 200);
  assert.equal(managerProgress.body.data.scope, "project");
  assert.equal(managerProgress.body.data.summary.totalTasks, 1);
  assert.equal(managerProgress.body.data.summary.completedPercentage, 100);
  assert.equal(managerProgress.body.data.statusCounts.done, 1);
  assert.ok(managerProgress.body.data.memberWorkload.some((item) => item.user._id === member._id.toString()));

  const memberProgress = await request(`/projects/${projectId}/progress`, { token: memberToken });
  assert.equal(memberProgress.status, 200);
  assert.equal(memberProgress.body.data.scope, "personal");
  assert.equal(memberProgress.body.data.summary.totalTasks, 1);
  assert.equal(memberProgress.body.data.memberWorkload, undefined);
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

test("invalid task, comment, note, subtask, and role inputs are rejected", async () => {
  const blankTask = await request(`/tasks/${projectId}`, {
    method: "POST",
    token: adminToken,
    body: { title: "   " },
  });
  assert.equal(blankTask.status, 422);

  const invalidPriority = await request(`/tasks/${projectId}/t/${taskId}`, {
    method: "PUT",
    token: adminToken,
    body: { priority: "urgent" },
  });
  assert.equal(invalidPriority.status, 422);

  const blankComment = await request(`/tasks/${projectId}/t/${taskId}/comments`, {
    method: "POST",
    token: memberToken,
    body: { content: "   " },
  });
  assert.equal(blankComment.status, 422);

  const blankNote = await request(`/notes/${projectId}`, {
    method: "POST",
    token: adminToken,
    body: { content: "   " },
  });
  assert.equal(blankNote.status, 422);

  const blankSubtask = await request(`/tasks/${projectId}/t/${taskId}/subtasks`, {
    method: "POST",
    token: adminToken,
    body: { title: "   " },
  });
  assert.equal(blankSubtask.status, 422);

  const createSubtask = await request(`/tasks/${projectId}/t/${taskId}/subtasks`, {
    method: "POST",
    token: adminToken,
    body: { title: "Valid subtask" },
  });
  assert.equal(createSubtask.status, 201);

  const invalidSubtaskUpdate = await request(
    `/tasks/${projectId}/st/${createSubtask.body.data._id}`,
    { method: "PUT", token: memberToken, body: { title: "" } },
  );
  assert.equal(invalidSubtaskUpdate.status, 422);

  const invalidRole = await request(`/projects/${projectId}/members/${member._id}`, {
    method: "PUT",
    token: adminToken,
    body: { newRole: "owner" },
  });
  assert.equal(invalidRole.status, 422);
});

test("a registered user can accept a valid invitation for their email", async () => {
  const invitationToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(invitationToken)
    .digest("hex");
  await ProjectInvite.create({
    project: projectId,
    email: outsider.email,
    role: "member",
    invitedBy: admin._id,
    token: hashedToken,
    tokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
  });

  const accepted = await request(`/projects/invitations/${invitationToken}/accept`, {
    method: "POST",
    token: outsiderToken,
  });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.body));

  const membership = await ProjectMember.findOne({
    project: projectId,
    user: outsider._id,
  });
  assert.ok(membership);

  const acceptedAgain = await request(`/projects/invitations/${invitationToken}/accept`, {
    method: "POST",
    token: outsiderToken,
  });
  assert.equal(acceptedAgain.status, 400);
});

test("API rate limiting returns a JSON 429 response", async () => {
  let limitedResponse;

  for (let attempt = 0; attempt < 1020; attempt += 1) {
    const response = await fetch(`${baseUrl}/healthcheck`);
    if (response.status === 429) {
      limitedResponse = await response.json();
      break;
    }
  }

  assert.ok(limitedResponse);
  assert.equal(limitedResponse.statusCode, 429);
  assert.equal(limitedResponse.success, false);
});
