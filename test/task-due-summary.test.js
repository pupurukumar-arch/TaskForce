import assert from "node:assert/strict";
import test from "node:test";
import { buildDueSummary } from "../src/controllers/task.controllers.js";

const userId = "64b000000000000000000001";
const otherUserId = "64b000000000000000000002";
const now = new Date("2026-08-11T12:00:00.000Z");
const task = (overrides = {}) => ({
  _id: Math.random().toString(),
  assignedTo: { _id: userId },
  status: "todo",
  dueDate: new Date("2026-08-11T15:00:00.000Z"),
  ...overrides,
});

test("due summary groups today's open tasks", () => {
  const result = buildDueSummary([task()], userId, now);
  assert.equal(result.counts.dueToday, 1);
  assert.equal(result.counts.dueThisWeek, 0);
  assert.equal(result.counts.overdue, 0);
});

test("due summary groups future tasks within seven days", () => {
  const result = buildDueSummary([
    task({ dueDate: new Date("2026-08-15T09:00:00.000Z") }),
  ], userId, now);
  assert.equal(result.counts.dueThisWeek, 1);
});

test("due summary groups overdue tasks", () => {
  const result = buildDueSummary([
    task({ dueDate: new Date("2026-08-10T17:00:00.000Z") }),
  ], userId, now);
  assert.equal(result.counts.overdue, 1);
});

test("due summary excludes completed tasks", () => {
  const result = buildDueSummary([task({ status: "done" })], userId, now);
  assert.deepEqual(result.counts, { dueToday: 0, dueThisWeek: 0, overdue: 0 });
});

test("due summary excludes tasks assigned to another user", () => {
  const result = buildDueSummary([
    task({ assignedTo: { _id: otherUserId } }),
  ], userId, now);
  assert.equal(result.counts.dueToday, 0);
});

test("due summary accepts an unpopulated assignee id", () => {
  const result = buildDueSummary([task({ assignedTo: userId })], userId, now);
  assert.equal(result.counts.dueToday, 1);
});

test("due summary sorts tasks by due date", () => {
  const later = task({ _id: "later", dueDate: new Date("2026-08-11T17:00:00.000Z") });
  const earlier = task({ _id: "earlier", dueDate: new Date("2026-08-11T14:00:00.000Z") });
  const result = buildDueSummary([later, earlier], userId, now);
  assert.deepEqual(result.dueToday.map(({ _id }) => _id), ["earlier", "later"]);
});

test("due summary does not mutate the source task order", () => {
  const source = [
    task({ _id: "later", dueDate: new Date("2026-08-11T20:00:00.000Z") }),
    task({ _id: "earlier", dueDate: new Date("2026-08-11T14:00:00.000Z") }),
  ];
  buildDueSummary(source, userId, now);
  assert.deepEqual(source.map(({ _id }) => _id), ["later", "earlier"]);
});

test("due summary excludes tasks without a due date", () => {
  const result = buildDueSummary([task({ dueDate: undefined })], userId, now);
  assert.deepEqual(result.counts, { dueToday: 0, dueThisWeek: 0, overdue: 0 });
});

test("due summary puts the tomorrow boundary in this-week tasks", () => {
  const tomorrowStart = new Date(now);
  tomorrowStart.setHours(0, 0, 0, 0);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const result = buildDueSummary([task({ dueDate: tomorrowStart })], userId, now);
  assert.equal(result.counts.dueToday, 0);
  assert.equal(result.counts.dueThisWeek, 1);
});
