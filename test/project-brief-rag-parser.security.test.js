import assert from "node:assert/strict";
import test from "node:test";
import { projectBriefTextSafety } from "../src/services/project-brief-rag-parser.service.js";

test("HTML entities are decoded exactly once", () => {
  assert.equal(projectBriefTextSafety.decodeHtml("&amp;lt;"), "&lt;");
  assert.equal(projectBriefTextSafety.decodeHtml("&lt;script&gt;"), "<script>");
});

test("Markdown table cells escape pipes and existing backslashes", () => {
  assert.equal(
    projectBriefTextSafety.escapeMarkdownCell(String.raw`folder\name|value`),
    String.raw`folder\\name\|value`,
  );
});
