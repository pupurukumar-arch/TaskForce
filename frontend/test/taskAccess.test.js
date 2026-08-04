import test from "node:test";
import assert from "node:assert/strict";
import { canSubmitForReview, isManagerRole } from "../src/lib/taskAccess.js";

test("only admin and project admin are task managers", () => {
  assert.equal(isManagerRole("admin"), true);
  assert.equal(isManagerRole("project_admin"), true);
  assert.equal(isManagerRole("member"), false);
});

test("only the assigned member can submit an open task for review", () => {
  const task = { assignedTo: { _id: "member-1" }, status: "in_progress" };

  assert.equal(canSubmitForReview(task, "member-1"), true);
  assert.equal(canSubmitForReview(task, "member-2"), false);
  assert.equal(canSubmitForReview({ ...task, status: "done" }, "member-1"), false);
  assert.equal(canSubmitForReview({ ...task, status: "in_review" }, "member-1"), false);
});
