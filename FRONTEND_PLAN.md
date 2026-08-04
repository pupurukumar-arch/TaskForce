# TaskForce Frontend Plan and API Contract

## 1. Purpose and Scope

Build a React frontend for the existing TaskForce REST API. The frontend must expose every documented backend capability while keeping the interface simple enough to explain in a placement interview.

This plan covers the documented backend requests. It does not add a separate frontend feature unless the backend supports it.

## 2. Current Backend Validation Status

- The Postman collection documents the backend request flows.
- `npm test` currently passes 11 automated end-to-end backend scenarios.
- The automated scenarios cover health, verified login rules, project creation/member addition, role restrictions, task priority/due dates, task review, comments, activity, notifications, validation, and invitation acceptance.
- The API mappings below guide frontend integration testing. A final browser pass should still test each visible action before delivery.

## 3. Visual Direction

- Product name: Orbit
- Desktop-first, responsive React dashboard
- Dark navy sidebar, white/light-gray workspace, indigo primary actions
- Clear status badges: Todo (gray), In Progress (blue), Done (green)
- Clear priority badges: Low (gray), Medium (amber), High (red)
- Tailwind CSS for consistent responsive layout and reusable components
- No copied Jira/Linear layout; use those products only as visual inspiration

## 4. Technology and Environment

| Item | Decision |
| --- | --- |
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Backend API | `http://localhost:3000/api/v1` locally |
| Frontend URL | `http://localhost:5173` locally |
| Frontend environment variable | `VITE_API_BASE_URL` |
| Deployment | Vercel frontend, Railway/Render backend, MongoDB Atlas |

The frontend must never contain MongoDB URIs, Mailtrap credentials, JWT secrets, or Redis credentials. Only a public API base URL belongs in `VITE_API_BASE_URL`.

## 5. Roles and UI Rules

Roles are assigned per project, not globally. The backend is the final authority; the frontend only hides unavailable actions for clarity.

| Capability | Admin | Project Admin | Member |
| --- | --- | --- |
| View project, members, tasks, notes, activity | Yes | Yes | Yes |
| Create/update/delete project | Yes | No | No |
| Add/remove members, change roles, send invitations | Yes | No | No |
| Create/update/delete task and create/delete subtask | Yes | Yes | No |
| Update subtask completion | Yes | Yes | Yes |
| Create/update/delete project note | Yes | No | No |
| Add comments | Yes | Yes | Yes |
| Delete comments | Any | Any | Own comment only |

## 6. Application Routes and Screens

| Frontend route | Screen and purpose |
| --- | --- |
| `/login` | Login, resend verification guidance |
| `/register` | Register; preserve `invite` query parameter if present |
| `/verify-email/:token` | Email verification result and login link |
| `/forgot-password` | Send password reset email |
| `/reset-password/:token` | Set new password |
| `/dashboard` | Project cards, personal workload, unread notifications |
| `/deadlines` | Personal due-today, due-this-week, and overdue task groups |
| `/calendar` | Personal monthly calendar for assigned tasks with due dates |
| `/projects/new` | Create project form |
| `/projects/:projectId` | Project overview, members, activity, notes, task summary |
| `/projects/:projectId/tasks` | Board/list task view, due-date summary, create task action |
| `/projects/:projectId/tasks/:taskId` | Task detail, edit form, attachments, subtasks, comments |
| `/notifications` | Full notification list and mark-read action |
| `/profile` | Current user, skills, change password, logout |
| `/accept-invitation` | Reads saved/query invitation token and calls accept API after login |

## 7. API Integration Contract

All protected requests send `Authorization: Bearer <accessToken>`. JSON endpoints send JSON. Task create/update uses `multipart/form-data` because attachments are supported.

### Health (1)

| Method | Endpoint | Frontend use |
| --- | --- | --- |
| GET | `/healthcheck` | Optional deployment/status check; no normal user screen required |

### Authentication (12)

| Method | Endpoint | Frontend behavior |
| --- | --- | --- |
| POST | `/auth/register` | Register form; show verification-email instruction |
| POST | `/auth/login` | Login form; save session access token; route to dashboard |
| GET | `/auth/verify-email/:verificationToken` | Verification screen reads token from route |
| POST | `/auth/refresh-token` | API client retries once after access-token expiry when refresh token is available |
| POST | `/auth/forgot-password` | Forgot-password form |
| POST | `/auth/reset-password/:resetToken` | Reset-password form |
| POST | `/auth/logout` | Logout button; clear frontend session after success |
| POST | `/auth/current-user` | Restore current user and profile on page refresh; note that this is POST in the current backend |
| PUT | `/auth/profile/skills` | Skills editor on profile page |
| GET | `/auth/task-summary` | Dashboard workload cards |
| POST | `/auth/change-password` | Change-password form |
| POST | `/auth/resend-email-verification` | Resend action for unverified-user guidance |

### Projects and Membership (13)

| Method | Endpoint | Frontend behavior |
| --- | --- | --- |
| GET | `/projects` | Dashboard project cards/sidebar project switcher |
| POST | `/projects` | Create-project form |
| GET | `/projects/:projectId` | Project overview header/details |
| PUT | `/projects/:projectId` | Admin project settings form |
| DELETE | `/projects/:projectId` | Admin confirmation dialog, then redirect to dashboard |
| GET | `/projects/:projectId/members` | Members tab; only visible to project members |
| POST | `/projects/:projectId/members` | Add existing registered user by email |
| PUT | `/projects/:projectId/members/:userId` | Admin role-change control |
| DELETE | `/projects/:projectId/members/:userId` | Admin remove-member confirmation |
| GET | `/projects/:projectId/members/:userId/task-summary` | Admin workload panel before task assignment |
| GET | `/projects/:projectId/activity` | Activity tab/timeline |
| POST | `/projects/:projectId/invitations` | Admin invite form for an unregistered email address |
| POST | `/projects/invitations/:invitationToken/accept` | Accept invitation only after login with invited email; show invalid/expired/reused error if rejected |

### Tasks, Comments, and Subtasks (12)

| Method | Endpoint | Frontend behavior |
| --- | --- | --- |
| GET | `/tasks/:projectId` | Task list and Kanban board data |
| GET | `/tasks/:projectId/due-summary` | Due today, due this week, and overdue summary cards |
| POST | `/tasks/:projectId` | Admin/project-admin task form with attachments |
| GET | `/tasks/:projectId/t/:taskId` | Task detail screen with subtasks |
| PUT | `/tasks/:projectId/t/:taskId` | Admin/project-admin edit task form |
| DELETE | `/tasks/:projectId/t/:taskId` | Admin/project-admin delete confirmation |
| GET | `/tasks/:projectId/t/:taskId/comments` | Comment list |
| POST | `/tasks/:projectId/t/:taskId/comments` | Comment form; show `@username` hint |
| DELETE | `/tasks/:projectId/t/:taskId/comments/:commentId` | Own-comment delete; manager can delete any |
| POST | `/tasks/:projectId/t/:taskId/subtasks` | Manager subtask form |
| PUT | `/tasks/:projectId/st/:subTaskId` | Completion checkbox for members; title edit only for managers |
| DELETE | `/tasks/:projectId/st/:subTaskId` | Manager delete control; refresh task list after each task or subtask mutation |

### Notifications (2)

| Method | Endpoint | Frontend behavior |
| --- | --- | --- |
| GET | `/notifications` | Notification bell count and notifications page |
| PATCH | `/notifications/:notificationId/read` | Mark item read when opened/clicked |

### Project Notes (5)

| Method | Endpoint | Frontend behavior |
| --- | --- | --- |
| GET | `/notes/:projectId` | Notes tab/list |
| POST | `/notes/:projectId` | Admin note editor |
| GET | `/notes/:projectId/n/:noteId` | Note detail view/modal |
| PUT | `/notes/:projectId/n/:noteId` | Admin note edit form |
| DELETE | `/notes/:projectId/n/:noteId` | Admin delete confirmation |

## 8. Frontend Data and Session Rules

1. Create one API client that adds the bearer token, reads JSON error responses, and maps backend `422` validation errors to form fields.
2. Store the session consistently in one frontend state module. The frontend must not trust its role check as security; it must handle `401`/`403` responses from the backend.
3. On `401`, try one refresh-token request if a refresh token is available; if it fails, clear session and route to login.
4. After every mutation, refetch the affected project/tasks/members/notes/notifications so the UI is current.
5. Preserve the invitation token from the registration link through register, verify-email, and login until the accept-invitation action succeeds.
6. Use `FormData` only for task create/update with attachments. Do not manually set the multipart content-type header.

## 9. Components and Reusable UI

- `AppLayout`, `Sidebar`, `TopBar`, `ProtectedRoute`, `RoleGate`
- `ApiClient`, session/auth state, error handler, loading state
- `ProjectCard`, `MemberTable`, `InviteMemberModal`, `ActivityTimeline`
- `TaskBoard`, `TaskColumn`, `TaskCard`, `TaskForm`, `TaskDetailDrawer`
- `PriorityBadge`, `DifficultyBadge`, `DueDateBadge`, `StatusBadge`
- `CommentList`, `SubtaskList`, `NotesPanel`, `NotificationBell`
- Shared `Modal`, `ConfirmDialog`, `EmptyState`, `ErrorState`, `LoadingState`, and `Toast`

## 10. Implementation Order and Acceptance Checks

1. **Foundation:** React/Vite/Tailwind, environment config, API client, layout, session state, protected routes.
2. **Authentication:** all 13 authentication actions, including verification and error states.
3. **Dashboard and projects:** list/create/detail/update/delete project plus personal workload.
4. **Members and invitations:** existing members, role controls, removal, workload preview, external invitation and acceptance flow.
5. **Tasks:** list/board, due summary, task create/edit/delete, priority/difficulty/attachments.
6. **Collaboration:** comments, mentions, subtasks, notes, activity history.
7. **Notifications and profile:** notifications, skills, password change, logout.
8. **Polish:** mobile responsiveness, form validation feedback, loading/error/empty states, role-specific action visibility.

Each module is tested before the next module begins. The final pass tests the complete user journey from registration to task collaboration.

## 11. Final Frontend Integration Test Checklist

Before delivery, test every relevant API mapping through the frontend or a documented API test where a screen is not applicable. At minimum, verify:

1. Register -> verify email -> login -> current user -> logout -> refresh token.
2. Forgot/reset/change password and resend verification handling.
3. Admin project CRUD, membership CRUD, role changes, workload preview, and activity.
4. Admin invitation to an unregistered email; invited user registration, verification, login, and acceptance.
5. Task CRUD, task validation errors, file attachment, priority, difficulty, due-date groups, and permissions.
6. Comment CRUD permissions, mentions, subtasks, notes, and notifications.
7. Member, project-admin, and admin UI behavior plus backend `403` handling.
8. Mobile layout, loading states, empty states, network failure messages, and expired-token redirect.

Do not automatically send repeated Mailtrap emails during testing. Trigger real email flows manually and wait briefly between free-plan emails.

## 12. Deployment Checklist

- Vercel: set `VITE_API_BASE_URL` to the deployed backend API URL.
- Railway/Render: set `CORS_ORIGIN` to the deployed Vercel URL.
- Railway/Render: set `PROJECT_INVITE_REDIRECT_URL` to `https://<frontend-domain>/register`.
- Keep JWT secrets, MongoDB URI, Mailtrap credentials, and Redis credentials only in backend/deployment environment variables.
- Run `npm test` against `TEST_MONGO_URI` before deployment.
- Perform the final browser smoke test after deployment.
