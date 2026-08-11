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

for (const [role, expected] of [
  ["admin", true],
  ["project_admin", true],
  ["member", false],
  ["", false],
  [undefined, false],
]) {
  test(`manager access for ${String(role)} is ${expected}`, () => {
    assert.equal(isManagerRole(role), expected);
  });
}

for (const [status, expected] of [
  ["todo", true],
  ["in_progress", true],
  ["in_review", false],
  ["done", false],
]) {
  test(`assigned member review submission from ${status} is ${expected}`, () => {
    assert.equal(canSubmitForReview({ assignedTo: { _id: "member-1" }, status }, "member-1"), expected);
  });
}

test("an unassigned task cannot be submitted for review", () => {
  assert.equal(canSubmitForReview({ status: "todo" }, "member-1"), false);
});
