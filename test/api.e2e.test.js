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
import { assertSeparateTestDatabase } from "../src/db/index.js";
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
  assertSeparateTestDatabase(testDatabaseUri, process.env.MONGO_URI);

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

test("state-changing browser requests reject untrusted origins", async () => {
  const response = await fetch(`${baseUrl}/auth/refresh-token`, {
    method: "POST",
    headers: { Origin: "https://untrusted.example" },
  });

  assert.equal(response.status, 403);
});

test("unverified users cannot log in", async () => {
  const response = await request("/auth/login", {
    method: "POST",
    body: { email: unverifiedUser.email, password: "TestPassword123!" },
  });
  assert.equal(response.status, 403);
  assert.match(response.body.message, /verify your email/i);
});

test("unverified users can register again and receive a fresh verification token", async () => {
  const originalId = unverifiedUser._id;
  const originalPassword = unverifiedUser.password;

  const response = await request("/auth/register", {
    method: "POST",
    body: {
      email: unverifiedUser.email,
      username: `${suffix}_unverified_retry`,
      password: "ReplacementPassword123!",
    },
  });

  assert.equal(response.status, 200);
  assert.match(response.body.message, /verification email has been resent/i);

  const retriedUser = await User.findById(originalId);
  assert.equal(retriedUser.isEmailVerified, false);
  assert.equal(retriedUser.username, `${suffix}_unverified_retry`);
  assert.notEqual(retriedUser.password, originalPassword);
  assert.ok(retriedUser.emailVerificationToken);
  assert.ok(retriedUser.emailVerificationExpiry > new Date());
});

test("authentication does not reveal whether an account exists", async () => {
  const unknownEmail = `${suffix}_unknown@example.com`;
  const loginResponse = await request("/auth/login", {
    method: "POST",
    body: { email: unknownEmail, password: "TestPassword123!" },
  });
  assert.equal(loginResponse.status, 401);
  assert.equal(loginResponse.body.message, "Invalid credentials");

  const forgotPasswordResponse = await request("/auth/forgot-password", {
    method: "POST",
    body: { email: unknownEmail },
  });
  assert.equal(forgotPasswordResponse.status, 200);
  assert.match(forgotPasswordResponse.body.message, /if an account exists/i);
});

test("authentication validators require an eight-character password", async () => {
  const registrationResponse = await request("/auth/register", {
    method: "POST",
    body: {
      email: `${suffix}_short_password@example.com`,
      username: `${suffix}short`,
      password: "short",
    },
  });
  assert.equal(registrationResponse.status, 422);

  const resetResponse = await request(
    `/auth/reset-password/${"a".repeat(64)}`,
    {
      method: "POST",
      body: { newPassword: "short" },
    },
  );
  assert.equal(resetResponse.status, 422);
});

test("registration rejects object injection and unsafe username characters", async () => {
  const objectInjectionResponse = await request("/auth/register", {
    method: "POST",
    body: {
      email: `${suffix}_object_username@example.com`,
      username: { $ne: null },
      password: "TestPassword123!",
    },
  });
  assert.equal(objectInjectionResponse.status, 422);

  const unsafeCharacterResponse = await request("/auth/register", {
    method: "POST",
    body: {
      email: `${suffix}_unsafe_username@example.com`,
      username: `${suffix}$unsafe`,
      password: "TestPassword123!",
    },
  });
  assert.equal(unsafeCharacterResponse.status, 422);
});

test("failed verification delivery rolls back a new registration", async () => {
  const email = `${suffix}_delivery_failure@example.com`;
  process.env.TEST_EMAIL_BEHAVIOR = "fail";

  try {
    const response = await request("/auth/register", {
      method: "POST",
      body: {
        email,
        username: `${suffix}deliveryfailure`,
        password: "TestPassword123!",
      },
    });

    assert.equal(response.status, 502);
    assert.equal(await User.exists({ email }), null);
  } finally {
    delete process.env.TEST_EMAIL_BEHAVIOR;
    await User.deleteMany({ email });
  }
});

test("project admin can create a project and add a member", async () => {
  const createProject = await request("/projects", {
    method: "POST",
    token: adminToken,
    body: { name: suffix, description: "Temporary automated API test project" },
  });
  assert.equal(createProject.status, 201);
  projectId = createProject.body.data._id;

  const creatorMembership = await ProjectMember.findOne({
    project: projectId,
    user: admin._id,
  });
  assert.equal(creatorMembership?.role, "admin");

  const addMember = await request(`/projects/${projectId}/members`, {
    method: "POST",
    token: adminToken,
    body: { email: member.email, role: "member" },
  });
  assert.equal(addMember.status, 201);
});

test("the last project Admin cannot be demoted or removed", async () => {
  const demoteLastAdmin = await request(
    `/projects/${projectId}/members/${admin._id}`,
    {
      method: "PUT",
      token: adminToken,
      body: { newRole: "member" },
    },
  );
  assert.equal(demoteLastAdmin.status, 409);
  assert.match(demoteLastAdmin.body.message, /at least one Admin/i);

  const removeLastAdmin = await request(
    `/projects/${projectId}/members/${admin._id}`,
    {
      method: "DELETE",
      token: adminToken,
    },
  );
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

  const dueSummary = await request(`/tasks/${projectId}/due-summary`, {
    token: memberToken,
  });
  assert.equal(dueSummary.status, 200);
  assert.equal(dueSummary.body.data.counts.dueToday, 1);

  const adminDueSummary = await request(`/tasks/${projectId}/due-summary`, {
    token: adminToken,
  });
  assert.equal(adminDueSummary.status, 200);
  assert.equal(adminDueSummary.body.data.counts.dueToday, 0);

  const personalDeadlines = await request("/tasks/my-deadlines", {
    token: memberToken,
  });
  assert.equal(personalDeadlines.status, 200);
  assert.equal(personalDeadlines.body.data.counts.dueToday, 1);
  assert.equal(personalDeadlines.body.data.dueToday[0].project.name, suffix);

  const personalCalendar = await request(
    `/tasks/my-calendar?month=${dueDate.toISOString().slice(0, 7)}`,
    { token: memberToken },
  );
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

test("project board bootstrap returns tasks, members, due summary, and caller role", async () => {
  const response = await request(`/tasks/${projectId}/board`, {
    token: memberToken,
  });

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data.tasks));
  assert.ok(Array.isArray(response.body.data.members));
  assert.equal(response.body.data.role, "member");
  assert.equal(response.body.data.dueSummary.counts.dueToday, 1);
  assert.ok(response.body.data.tasks.some((taskItem) => taskItem._id === taskId.toString()));
  assert.ok(response.body.data.members.some((membership) => membership.user._id === member._id.toString()));
});

test("project board bootstrap rejects non-members", async () => {
  const response = await request(`/tasks/${projectId}/board`, {
    token: outsiderToken,
  });
  assert.equal(response.status, 400);
});

test("unread notification count returns a compact numeric response", async () => {
  const response = await request("/notifications/unread-count", {
    token: memberToken,
  });
  assert.equal(response.status, 200);
  assert.equal(typeof response.body.data.count, "number");
  assert.ok(response.body.data.count >= 1);
});

test("a member submits an assigned task and an admin approves it", async () => {
  const submitForReview = await request(
    `/tasks/${projectId}/t/${taskId}/submit-review`,
    { method: "POST", token: memberToken },
  );
  assert.equal(submitForReview.status, 200);
  assert.equal(submitForReview.body.data.status, "in_review");
  assert.equal(
    submitForReview.body.data.submittedForReviewBy,
    member._id.toString(),
  );
  const reviewNotification = await Notification.findOne({
    recipient: admin._id,
    task: taskId,
    type: "task_submitted_for_review",
  });
  assert.ok(
    reviewNotification,
    "project admin should be notified when work is submitted",
  );

  const cannotMoveReviewTaskToTodo = await request(
    `/tasks/${projectId}/t/${taskId}`,
    {
      method: "PUT",
      token: adminToken,
      body: { status: "todo" },
    },
  );
  assert.equal(cannotMoveReviewTaskToTodo.status, 400);
  assert.match(cannotMoveReviewTaskToTodo.body.message, /under review/i);

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
  const managerProgress = await request(`/projects/${projectId}/progress`, {
    token: adminToken,
  });
  assert.equal(managerProgress.status, 200);
  assert.equal(managerProgress.body.data.scope, "project");
  assert.equal(managerProgress.body.data.summary.totalTasks, 1);
  assert.equal(managerProgress.body.data.summary.completedPercentage, 100);
  assert.equal(managerProgress.body.data.statusCounts.done, 1);
  assert.ok(
    managerProgress.body.data.memberWorkload.some(
      (item) => item.user._id === member._id.toString(),
    ),
  );

  const managerPersonalProgress = await request(
    `/projects/${projectId}/progress?scope=personal`,
    { token: adminToken },
  );
  assert.equal(managerPersonalProgress.status, 200);
  assert.equal(managerPersonalProgress.body.data.scope, "personal");
  assert.equal(managerPersonalProgress.body.data.memberWorkload, undefined);

  const memberProgress = await request(`/projects/${projectId}/progress`, {
    token: memberToken,
  });
  assert.equal(memberProgress.status, 200);
  assert.equal(memberProgress.body.data.scope, "personal");
  assert.equal(memberProgress.body.data.summary.totalTasks, 1);
  assert.equal(memberProgress.body.data.memberWorkload, undefined);
});

test("comments, activity, and notifications are stored for the right users", async () => {
  const notifications = await request("/notifications", { token: memberToken });
  assert.equal(notifications.status, 200);
  assert.ok(
    notifications.body.data.some(
      (item) => item.type === "project_member_added",
    ),
  );
  assert.ok(
    notifications.body.data.some((item) => item.type === "task_assigned"),
  );

  const comment = await request(`/tasks/${projectId}/t/${taskId}/comments`, {
    method: "POST",
    token: memberToken,
    body: { content: `Please review this @${admin.username}` },
  });
  assert.equal(comment.status, 201);

  const adminNotifications = await request("/notifications", {
    token: adminToken,
  });
  const mention = adminNotifications.body.data.find(
    (item) => item.type === "comment_mention",
  );
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

  const activity = await request(`/projects/${projectId}/activity`, {
    token: memberToken,
  });
  assert.equal(activity.status, 200);
  assert.ok(activity.body.data.some((item) => item.type === "task_created"));
});

test("invalid task, comment, note, subtask, and role inputs are rejected", async () => {
  const invalidProjectId = await request("/projects/not-an-object-id", {
    token: adminToken,
  });
  assert.equal(invalidProjectId.status, 400);

  const operatorProjectName = await request("/projects", {
    method: "POST",
    token: adminToken,
    body: { name: { $ne: null } },
  });
  assert.equal(operatorProjectName.status, 422);

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

  const blankComment = await request(
    `/tasks/${projectId}/t/${taskId}/comments`,
    {
      method: "POST",
      token: memberToken,
      body: { content: "   " },
    },
  );
  assert.equal(blankComment.status, 422);

  const blankNote = await request(`/notes/${projectId}`, {
    method: "POST",
    token: adminToken,
    body: { content: "   " },
  });
  assert.equal(blankNote.status, 422);

  const blankSubtask = await request(
    `/tasks/${projectId}/t/${taskId}/subtasks`,
    {
      method: "POST",
      token: adminToken,
      body: { title: "   " },
    },
  );
  assert.equal(blankSubtask.status, 422);

  const createSubtask = await request(
    `/tasks/${projectId}/t/${taskId}/subtasks`,
    {
      method: "POST",
      token: adminToken,
      body: { title: "Valid subtask" },
    },
  );
  assert.equal(createSubtask.status, 201);

  const invalidSubtaskUpdate = await request(
    `/tasks/${projectId}/st/${createSubtask.body.data._id}`,
    { method: "PUT", token: memberToken, body: { title: "" } },
  );
  assert.equal(invalidSubtaskUpdate.status, 422);

  const invalidRole = await request(
    `/projects/${projectId}/members/${member._id}`,
    {
      method: "PUT",
      token: adminToken,
      body: { newRole: "owner" },
    },
  );
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

  const accepted = await request(
    `/projects/invitations/${invitationToken}/accept`,
    {
      method: "POST",
      token: outsiderToken,
    },
  );
  assert.equal(accepted.status, 200, JSON.stringify(accepted.body));

  const membership = await ProjectMember.findOne({
    project: projectId,
    user: outsider._id,
  });
  assert.ok(membership);

  const acceptedAgain = await request(
    `/projects/invitations/${invitationToken}/accept`,
    {
      method: "POST",
      token: outsiderToken,
    },
  );
  assert.equal(acceptedAgain.status, 400);
});

test("sensitive authentication routes share a 30-request limiter", async () => {
  let limitedResponse;

  for (let attempt = 0; attempt < 31; attempt += 1) {
    const response = await request("/auth/login", {
      method: "POST",
      body: {},
    });

    if (response.status === 429) {
      limitedResponse = response.body;
      break;
    }
  }

  assert.ok(limitedResponse);
  assert.equal(limitedResponse.statusCode, 429);
  assert.equal(
    limitedResponse.message,
    "Too many authentication requests. Please try again in 15 minutes.",
  );
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
