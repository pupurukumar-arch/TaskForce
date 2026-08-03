# TaskForce API

TaskForce is a REST API for project-based collaboration. It provides authentication, projects and member roles, tasks and attachments, subtasks, and project notes.

## Requirements

- Node.js 20 or later
- MongoDB (Atlas or local)
- SMTP credentials for verification and password-reset emails (Mailtrap is suitable for local development)

## Run locally

```bash
npm ci
cp .env.example .env
npm start
```

The server starts on `http://localhost:3000` unless `PORT` is changed. Check it with `GET /api/v1/healthcheck`.

## Configuration

Create `.env` from `.env.example` and set the following values. Never commit `.env`.

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port, for example `3000` |
| `MONGO_URI` | MongoDB connection URI |
| `ACCESS_TOKEN_SECRET` | Long random secret for access tokens |
| `ACCESS_TOKEN_EXPIRY` | Access token lifetime, for example `1d` |
| `REFRESH_TOKEN_SECRET` | Different long random secret for refresh tokens |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifetime, for example `10d` |
| `CORS_ORIGIN` | Allowed frontend origin, for example `http://localhost:5173` |
| `FORGOT_PASSWORD_REDIRECT_URL` | Frontend reset-password URL |
| `MAILTRAP_SMTP_HOST` | SMTP host |
| `MAILTRAP_SMTP_PORT` | SMTP port |
| `MAILTRAP_SMTP_USER` | SMTP username |
| `MAILTRAP_SMTP_PASS` | SMTP password |

## Authentication

Most endpoints require a JWT access token. After `POST /api/v1/auth/login`, take `data.accessToken` from the response and include it in requests:

```http
Authorization: Bearer <access-token>
```

The login response also includes a refresh token. Use it with `POST /api/v1/auth/refresh-token` when the access token expires.

Project roles are `admin`, `project_admin`, and `member`. Read operations allow all three roles; project and task administration is restricted as described by the routes.

## Response format

Successful responses use this shape:

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Descriptive message",
  "success": true
}
```

Errors are JSON and normally include `statusCode`, `message`, `success: false`, and `errors`.

## API reference

Base URL: `http://localhost:3000/api/v1`

### Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/healthcheck` | No | Service health check |

### Auth

| Method | Path | Auth | Body / notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | No | `email`, `username`, `password`, optional `fullName`; sends verification email |
| POST | `/auth/login` | No | `email`, `password`; returns access and refresh tokens |
| GET | `/auth/verify-email/:verificationToken` | No | Use token from verification email |
| POST | `/auth/refresh-token` | No | `refreshToken` in JSON body or cookie |
| POST | `/auth/forgot-password` | No | `email`; sends reset email |
| POST | `/auth/reset-password/:resetToken` | No | `newPassword`; use token from reset link |
| POST | `/auth/logout` | Yes | Invalidates refresh token |
| POST | `/auth/current-user` | Yes | Returns logged-in user |
| PUT | `/auth/profile/skills` | Yes | Saves a member's `skills` array |
| GET | `/auth/task-summary` | Yes | Returns the current member's assigned-task and in-progress difficulty counts |
| POST | `/auth/change-password` | Yes | `oldPassword`, `newPassword` |
| POST | `/auth/resend-email-verification` | Yes | Sends another verification email |

Example registration:

```json
{
  "email": "ada@example.com",
  "username": "ada",
  "password": "replace-with-a-strong-password",
  "fullName": "Ada Lovelace"
}
```

### Projects and members

| Method | Path | Minimum role | Body / notes |
| --- | --- | --- | --- |
| GET | `/projects` | Authenticated | List projects for current user |
| POST | `/projects` | Authenticated | `name`, optional `description` |
| GET | `/projects/:projectId` | Member | Get project |
| PUT | `/projects/:projectId` | Admin | `name`, optional `description` |
| DELETE | `/projects/:projectId` | Admin | Delete project |
| GET | `/projects/:projectId/members` | Authenticated | List members |
| GET | `/projects/:projectId/members/:userId/task-summary` | Admin | View a selected member's workload before assigning a task |
| POST | `/projects/:projectId/members` | Admin | `email`, `role` |
| PUT | `/projects/:projectId/members/:userId` | Admin | `newRole` |
| DELETE | `/projects/:projectId/members/:userId` | Admin | Remove member |
| GET | `/projects/:projectId/activity` | Member | View project activity history |

Example project:

```json
{
  "name": "Website redesign",
  "description": "Plan and deliver the new marketing site."
}
```

### Tasks and subtasks

| Method | Path | Minimum role | Body / notes |
| --- | --- | --- | --- |
| GET | `/tasks/:projectId` | Member | List project tasks |
| GET | `/tasks/:projectId/due-summary` | Member | Group open tasks as due today, due this week, or overdue |
| POST | `/tasks/:projectId` | Admin or project admin | `multipart/form-data`: `title`, optional `description`, `assignedTo`, `status`, `difficulty`, and up to five `attachments` (1 MB each) |
| GET | `/tasks/:projectId/t/:taskId` | Member | Get task and subtasks |
| PUT | `/tasks/:projectId/t/:taskId` | Admin or project admin | Same optional task fields and attachments |
| DELETE | `/tasks/:projectId/t/:taskId` | Admin or project admin | Delete task and its subtasks |
| GET | `/tasks/:projectId/t/:taskId/comments` | Member | List task comments |
| POST | `/tasks/:projectId/t/:taskId/comments` | Member | `content` |
| DELETE | `/tasks/:projectId/t/:taskId/comments/:commentId` | Member | Delete own comment; managers may delete any comment |
| POST | `/tasks/:projectId/t/:taskId/subtasks` | Admin or project admin | `title` |
| PUT | `/tasks/:projectId/st/:subTaskId` | Member | `isCompleted`; administrators may also set `title` |
| DELETE | `/tasks/:projectId/st/:subTaskId` | Admin or project admin | Delete subtask |

`status` may be `todo`, `in_progress`, or `done`. `difficulty` may be `easy`, `medium`, or `hard`. Add an optional ISO `dueDate` to track deadlines. If `assignedTo` is supplied, it must be the ID of a member of that project.

Example task JSON (when not uploading a file):

```json
{
  "title": "Create homepage wireframes",
  "description": "Prepare the desktop and mobile flows.",
  "assignedTo": "<project-member-user-id>",
  "status": "in_progress",
  "difficulty": "medium",
  "dueDate": "2026-08-10T17:00:00.000Z"
}
```

### Project notes

| Method | Path | Minimum role | Body / notes |
| --- | --- | --- | --- |
| GET | `/notes/:projectId` | Member | List project notes |
| POST | `/notes/:projectId` | Admin | `content` |
| GET | `/notes/:projectId/n/:noteId` | Member | Get note |
| PUT | `/notes/:projectId/n/:noteId` | Admin | `content` |
| DELETE | `/notes/:projectId/n/:noteId` | Admin | Delete note |

## Postman

Import [TaskForce.postman_collection.json](./TaskForce.postman_collection.json) into Postman. It provides all 41 routes with variables for the base URL, tokens, and resource IDs.

Suggested order: register, verify the email token from Mailtrap, log in, create a project, then use its ID to create members, tasks, subtasks, and notes. Set collection variables after each creation response.

## Security note

Do not publish `.env`, MongoDB URIs, SMTP credentials, JWT secrets, or real tokens. `.gitignore` excludes `.env` and `node_modules`.
