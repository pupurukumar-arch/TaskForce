import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSeparateTestDatabase,
  getMongoDatabaseIdentity,
} from "../src/db/index.js";

test("database identity uses the explicit MongoDB database name", () => {
  assert.deepEqual(
    getMongoDatabaseIdentity(
      "mongodb+srv://example.mongodb.net/taskforge_test?retryWrites=true",
    ),
    { host: "example.mongodb.net", database: "taskforge_test" },
  );
});

test("test database guard rejects the same logical database", () => {
  assert.throws(
    () =>
      assertSeparateTestDatabase(
        "mongodb+srv://example.mongodb.net/taskforge?appName=tests",
        "mongodb+srv://example.mongodb.net/taskforge?appName=development",
      ),
    /different database name/i,
  );
});

test("test database guard accepts a separate database name", () => {
  assert.doesNotThrow(() =>
    assertSeparateTestDatabase(
      "mongodb+srv://example.mongodb.net/taskforge_test",
      "mongodb+srv://example.mongodb.net/taskforge_dev",
    ),
  );
});
