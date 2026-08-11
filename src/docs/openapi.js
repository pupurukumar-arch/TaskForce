const jsonResponse = (description) => ({
  200: { description },
  400: { $ref: "#/components/responses/ValidationError" },
  401: { $ref: "#/components/responses/Unauthorized" },
  429: { $ref: "#/components/responses/TooManyRequests" },
});

const authenticated = (summary, extra = {}) => ({
  summary,
  security: [{ bearerAuth: [] }],
  responses: jsonResponse("Request completed successfully"),
  ...extra,
});

const openapiSpecification = {
  openapi: "3.0.3",
  info: {
    title: "TaskForce API",
    version: "1.0.0",
    description: "Interactive documentation for the TaskForce project collaboration API. Use **Authorize** with the access token returned by login before trying protected endpoints.",
  },
  servers: [{ url: "/api/v1", description: "Current server" }],
  tags: [
    { name: "Health", description: "Service availability" },
    { name: "Authentication", description: "Account and session operations" },
    { name: "Projects", description: "Projects, members, invitations, and activity" },
    { name: "Tasks", description: "Tasks, review flow, comments, and subtasks" },
    { name: "Notes", description: "Project notes" },
    { name: "Notifications", description: "Current user's notifications" },
  ],
  paths: {
    "/healthcheck": {
      get: { tags: ["Health"], summary: "Check API health", responses: { 200: { description: "API is available" } } },
    },
    "/auth/register": {
      post: {
        tags: ["Authentication"], summary: "Create an account and send verification email",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } } },
        responses: { 201: { description: "Account created" }, 400: { $ref: "#/components/responses/ValidationError" } },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"], summary: "Log in and receive access and refresh tokens",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } },
        responses: { 200: { description: "Logged in" }, 401: { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/auth/verify-email/{verificationToken}": {
      get: { tags: ["Authentication"], summary: "Verify email address", parameters: [{ $ref: "#/components/parameters/verificationToken" }], responses: jsonResponse("Email verified") },
    },
    "/auth/resend-email-verification": {
      post: {
        tags: ["Authentication"], summary: "Send a fresh email-verification link",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/EmailRequest" } } } },
        responses: jsonResponse("Verification email sent"),
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Authentication"], summary: "Send password-reset link",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/EmailRequest" } } } },
        responses: jsonResponse("Password reset email sent"),
      },
    },
    "/auth/reset-password/{resetToken}": {
      post: {
        tags: ["Authentication"], summary: "Set a new password from reset link", parameters: [{ $ref: "#/components/parameters/resetToken" }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["newPassword"], properties: { newPassword: { type: "string", format: "password" } } } } } },
        responses: jsonResponse("Password reset successfully"),
      },
    },
    "/auth/refresh-token": {
      post: {
        tags: ["Authentication"], summary: "Refresh an access token",
        description: "Uses the HTTP-only refresh-token cookie set during login.",
        responses: jsonResponse("Access token refreshed"),
      },
    },
    "/auth/current-user": { post: authenticated("Get current user") },
    "/auth/logout": { post: authenticated("Log out current user") },
    "/auth/profile/skills": {
      put: authenticated("Update current user's skills", { requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["skills"], properties: { skills: { type: "array", items: { type: "string" } } } } } } } }),
    },
    "/auth/task-summary": { get: authenticated("Get personal task workload summary") },
    "/auth/change-password": {
      post: authenticated("Change current password", { requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["oldPassword", "newPassword"], properties: { oldPassword: { type: "string", format: "password" }, newPassword: { type: "string", format: "password" } } } } } } }),
    },
    "/projects": {
      get: authenticated("List projects for current user"),
      post: authenticated("Create a project", { requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ProjectRequest" } } } } }),
    },
    "/projects/{projectId}": {
      get: authenticated("Get one project", { parameters: [{ $ref: "#/components/parameters/projectId" }, { name: "includeBriefUrl", in: "query", schema: { type: "boolean", default: false }, description: "Mint a short-lived Project Brief URL only when it is about to be opened" }] }),
      put: authenticated("Update a project (Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ProjectRequest" } } } } }),
      delete: authenticated("Delete a project and related data (Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }] }),
    },
    "/projects/{projectId}/members": {
      get: authenticated("List project members", { parameters: [{ $ref: "#/components/parameters/projectId" }] }),
      post: authenticated("Add registered member (Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MemberRequest" } } } } }),
    },
    "/projects/{projectId}/progress": {
      get: authenticated("Get role-aware project progress and workload", { parameters: [{ $ref: "#/components/parameters/projectId" }] }),
    },
    "/projects/{projectId}/invitations": {
      post: authenticated("Invite an unregistered user (Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MemberRequest" } } } } }),
    },
    "/projects/invitations/{invitationToken}/accept": {
      post: authenticated("Accept a project invitation", { parameters: [{ $ref: "#/components/parameters/invitationToken" }] }),
    },
    "/projects/{projectId}/members/{userId}": {
      put: authenticated("Change a member role (Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/userId" }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RoleRequest" } } } } }),
      delete: authenticated("Remove a member (Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/userId" }] }),
    },
    "/projects/{projectId}/members/{userId}/task-summary": { get: authenticated("Get member workload before assignment (Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/userId" }] }) },
    "/projects/{projectId}/activity": { get: authenticated("List project activity", { parameters: [{ $ref: "#/components/parameters/projectId" }] }) },
    "/tasks/my-deadlines": { get: authenticated("Get personal due-today, due-this-week, and overdue tasks") },
    "/tasks/my-calendar": { get: authenticated("Get personal monthly task calendar", { parameters: [{ name: "month", in: "query", schema: { type: "string", example: "2026-08" }, description: "Optional month in YYYY-MM format" }] }) },
    "/tasks/{projectId}": {
      get: authenticated("List project tasks", { parameters: [{ $ref: "#/components/parameters/projectId" }] }),
      post: authenticated("Create a task (Admin or Project Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }], requestBody: { required: true, content: { "multipart/form-data": { schema: { $ref: "#/components/schemas/TaskRequest" } } } } }),
    },
    "/tasks/{projectId}/due-summary": { get: authenticated("Get due-date summary for a project", { parameters: [{ $ref: "#/components/parameters/projectId" }] }) },
    "/tasks/{projectId}/board": { get: authenticated("Load project tasks, members, due summary, and caller role in one request", { parameters: [{ $ref: "#/components/parameters/projectId" }] }) },
    "/tasks/{projectId}/t/{taskId}": {
      get: authenticated("Get task details and subtasks", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/taskId" }] }),
      put: authenticated("Update task (Admin or Project Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/taskId" }], requestBody: { content: { "multipart/form-data": { schema: { $ref: "#/components/schemas/TaskRequest" } } } } }),
      delete: authenticated("Delete task and subtasks (Admin or Project Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/taskId" }] }),
    },
    "/tasks/{projectId}/t/{taskId}/submit-review": { post: authenticated("Submit assigned task for review with attachments", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/taskId" }], requestBody: { content: { "multipart/form-data": { schema: { type: "object", properties: { attachments: { type: "array", items: { type: "string", format: "binary" } } } } } } } }) },
    "/tasks/{projectId}/t/{taskId}/review": { post: authenticated("Approve or send back a task (Admin or Project Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/taskId" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["approved"], properties: { approved: { type: "boolean" } } } } } } }) },
    "/tasks/{projectId}/t/{taskId}/comments": {
      get: authenticated("List task comments", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/taskId" }] }),
      post: authenticated("Add task comment", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/taskId" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["content"], properties: { content: { type: "string" } } } } } } }),
    },
    "/tasks/{projectId}/t/{taskId}/comments/{commentId}": { delete: authenticated("Delete own comment or any comment as manager", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/taskId" }, { $ref: "#/components/parameters/commentId" }] }) },
    "/tasks/{projectId}/t/{taskId}/subtasks": { post: authenticated("Create subtask (Admin or Project Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/taskId" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["title"], properties: { title: { type: "string" } } } } } } }) },
    "/tasks/{projectId}/st/{subTaskId}": {
      put: authenticated("Update subtask completion or title", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/subTaskId" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { isCompleted: { type: "boolean" }, title: { type: "string" } } } } } } }),
      delete: authenticated("Delete subtask (Admin or Project Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/subTaskId" }] }),
    },
    "/notes/{projectId}": {
      get: authenticated("List project notes", { parameters: [{ $ref: "#/components/parameters/projectId" }] }),
      post: authenticated("Create project note (Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["content"], properties: { content: { type: "string" } } } } } } }),
    },
    "/notes/{projectId}/n/{noteId}": {
      get: authenticated("Get a project note", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/noteId" }] }),
      put: authenticated("Update project note (Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/noteId" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["content"], properties: { content: { type: "string" } } } } } } }),
      delete: authenticated("Delete project note (Admin)", { parameters: [{ $ref: "#/components/parameters/projectId" }, { $ref: "#/components/parameters/noteId" }] }),
    },
    "/notifications": { get: authenticated("List current user's notifications") },
    "/notifications/unread-count": { get: authenticated("Get current user's unread notification count") },
    "/notifications/{notificationId}/read": { patch: authenticated("Mark notification as read", { parameters: [{ $ref: "#/components/parameters/notificationId" }] }) },
  },
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    parameters: Object.fromEntries(["projectId", "taskId", "userId", "commentId", "subTaskId", "noteId", "notificationId", "verificationToken", "resetToken", "invitationToken"].map((name) => [name, { name, in: "path", required: true, schema: { type: "string" } }])),
    responses: {
      Unauthorized: { description: "Missing, expired, or invalid access token" },
      ValidationError: { description: "Request body or path value is invalid" },
      TooManyRequests: { description: "Too many requests from this IP address; retry after the rate-limit window" },
    },
    schemas: {
      RegisterRequest: { type: "object", required: ["email", "username", "password"], properties: { email: { type: "string", format: "email" }, username: { type: "string" }, password: { type: "string", format: "password" }, fullName: { type: "string" } } },
      LoginRequest: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string", format: "password" } } },
      EmailRequest: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } },
      ProjectRequest: { type: "object", required: ["name"], properties: { name: { type: "string" }, description: { type: "string" } } },
      MemberRequest: { type: "object", required: ["email", "role"], properties: { email: { type: "string", format: "email" }, role: { type: "string", enum: ["admin", "project_admin", "member"] } } },
      RoleRequest: { type: "object", required: ["newRole"], properties: { newRole: { type: "string", enum: ["admin", "project_admin", "member"] } } },
      TaskRequest: { type: "object", required: ["title"], properties: { title: { type: "string" }, description: { type: "string" }, assignedTo: { type: "string" }, status: { type: "string", enum: ["todo", "in_progress", "in_review", "done"] }, priority: { type: "string", enum: ["low", "medium", "high"] }, difficulty: { type: "string", enum: ["easy", "medium", "hard"] }, dueDate: { type: "string", format: "date-time" }, attachments: { type: "array", items: { type: "string", format: "binary" } } } },
    },
  },
};

export { openapiSpecification };
