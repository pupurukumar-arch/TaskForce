import { body } from "express-validator";
import {
  AvailableTaskDifficulties,
  AvailableTaskPriorities,
  AvailableTaskStatues,
  AvailableUserRole,
} from "../utils/constants.js";
const userRegisterValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Email is invalid"),
    body("username")
      .trim()
      .notEmpty()
      .withMessage("Username is required")
      .isLowercase()
      .withMessage("Username must be in lower case")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters long"),
    body("password").trim().notEmpty().withMessage("Password is required"),
    body("fullName").optional().trim(),
  ];
};

const userLoginValidator = () => {
  return [
    body("email").optional().isEmail().withMessage("Email is invalid"),
    body("password").notEmpty().withMessage("Password is required"),
  ];
};

const userChangeCurrentPasswordValidator = () => {
  return [
    body("oldPassword").notEmpty().withMessage("Old password is required"),
    body("newPassword").notEmpty().withMessage("New password is required"),
  ];
};

const userForgotPasswordValidator = () => {
  return [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Email is invalid"),
  ];
};

const userResetForgotPasswordValidator = () => {
  return [body("newPassword").notEmpty().withMessage("Password is required")];
};

const userSkillsValidator = () => {
  return [
    body("skills")
      .isArray({ min: 1 })
      .withMessage("Skills must be a non-empty array"),
    body("skills.*")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Each skill must be a non-empty string"),
  ];
};

const createProjectValidator = () => {
  return [
    body("name").notEmpty().withMessage("Name is required"),
    body("description").optional(),
  ];
};

const addMembertoProjectValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Email is invalid"),
    body("role")
      .notEmpty()
      .withMessage("Role is required")
      .isIn(AvailableUserRole)
      .withMessage("Role is invalid"),
  ];
};

const updateMemberRoleValidator = () => {
  return [
    body("newRole")
      .trim()
      .notEmpty()
      .withMessage("New role is required")
      .isIn(AvailableUserRole)
      .withMessage("Role is invalid"),
  ];
};

const taskFieldsValidator = (titleRequired) => [
  titleRequired
    ? body("title").trim().notEmpty().withMessage("Task title is required")
    : body("title").optional().trim().notEmpty().withMessage("Task title cannot be empty"),
  body("description").optional().isString().trim(),
  body("assignedTo")
    .optional()
    .custom((value) => value === "" || /^[a-fA-F0-9]{24}$/.test(value))
    .withMessage("Assignee must be a valid user id"),
  body("status").optional().isIn(AvailableTaskStatues).withMessage("Task status is invalid"),
  body("difficulty")
    .optional()
    .isIn(AvailableTaskDifficulties)
    .withMessage("Task difficulty is invalid"),
  body("priority")
    .optional()
    .isIn(AvailableTaskPriorities)
    .withMessage("Task priority is invalid"),
  body("dueDate").optional({ checkFalsy: true }).isISO8601().withMessage("Due date is invalid"),
];

const createTaskValidator = () => taskFieldsValidator(true);
const updateTaskValidator = () => taskFieldsValidator(false);

const taskCommentValidator = () => [
  body("content").trim().notEmpty().withMessage("Comment content is required"),
];

const noteValidator = () => [
  body("content").trim().notEmpty().withMessage("Note content is required"),
];

const createSubtaskValidator = () => [
  body("title").trim().notEmpty().withMessage("Subtask title is required"),
];

const updateSubtaskValidator = () => [
  body("title").optional().trim().notEmpty().withMessage("Subtask title cannot be empty"),
  body("isCompleted").optional().isBoolean().withMessage("isCompleted must be true or false"),
];

export {
  userRegisterValidator,
  userLoginValidator,
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userResetForgotPasswordValidator,
  userSkillsValidator,
  createProjectValidator,
  addMembertoProjectValidator,
  updateMemberRoleValidator,
  createTaskValidator,
  updateTaskValidator,
  taskCommentValidator,
  noteValidator,
  createSubtaskValidator,
  updateSubtaskValidator,
};
