import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { getAttachmentBuffer } from "../utils/s3.js";

const MAX_TEXT_CHARS = 18_000;
const MAX_TABLES = 12;
const MAX_IMAGES = 2;
const MAX_IMAGE_BYTES = 1_500_000;

const compactText = (value, max = MAX_TEXT_CHARS) =>
  String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
const decodeHtml = (value) => String(value || "")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const htmlText = (value) => compactText(decodeHtml(String(value || "").replace(/<[^>]+>/g, " ")), 800);

const rowsToMarkdown = (rows) => rows
  .filter((row) => row.length)
  .map((row) => `| ${row.map((cell) => compactText(cell, 240).replace(/\|/g, "\\|")).join(" | ")} |`)
  .join("\n");

const docxTablesToMarkdown = (html) => {
  const tables = [];
  const textWithoutTables = html.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
    const rows = [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map(([rowHtml]) =>
      [...rowHtml.matchAll(/<t[dh][\s\S]*?<\/t[dh]>/gi)].map(([cellHtml]) => htmlText(cellHtml)),
    );
    const markdown = rowsToMarkdown(rows);
    if (markdown && tables.length < MAX_TABLES) tables.push(markdown);
    return " ";
  });
  const images = [...html.matchAll(/<img[^>]+src=["'](data:image\/[^"']+)["']/gi)]
    .map((match) => match[1])
    .slice(0, MAX_IMAGES);
  return { text: htmlText(textWithoutTables), tables, images };
};

const parsePdf = async (buffer) => {
  const parser = new PDFParse({ data: buffer });
  try {
    const [textResult, tableResult, imageResult] = await Promise.all([
      parser.getText(),
      parser.getTable(),
      parser.getImage({ imageThreshold: 80 }),
    ]);
    const tables = (tableResult.pages || [])
      .flatMap((page) => page.tables || [])
      .slice(0, MAX_TABLES)
      .map(rowsToMarkdown)
      .filter(Boolean);
    const images = (imageResult.pages || [])
      .flatMap((page) => page.images || [])
      .map((image) => ({ data: image.data, mimeType: image.mimeType || "image/png" }))
      .filter((image) => image.data?.length <= MAX_IMAGE_BYTES)
      .slice(0, MAX_IMAGES);
    return { text: compactText(textResult.text), tables, images };
  } finally {
    await parser.destroy();
  }
};

const parseDocx = async (buffer) => {
  const result = await mammoth.convertToHtml({ buffer });
  const parsed = docxTablesToMarkdown(result.value);
  return {
    text: compactText(parsed.text),
    tables: parsed.tables,
    images: parsed.images.map((dataUrl) => {
      const [header, base64] = dataUrl.split(",", 2);
      return { data: Buffer.from(base64, "base64"), mimeType: header.match(/data:(image\/[^;]+)/)?.[1] || "image/png" };
    }).filter((image) => image.data.length <= MAX_IMAGE_BYTES),
  };
};

const describeImages = async (images) => {
  if (!images.length || !process.env.GEMINI_API_KEY) return "";
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: "Extract only factual project information from these document images: labels, table values, chart trends, deadlines, names, and risks. Return concise plain text. If an image has no useful project information, say nothing about it." },
              ...images.map((image) => ({ inlineData: { mimeType: image.mimeType, data: Buffer.from(image.data).toString("base64") } })),
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 900 },
        }),
      },
    );
    if (!response.ok) return "";
    const payload = await response.json();
    return compactText(payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join(""), 4_000);
  } catch (error) {
    console.warn("Project brief image analysis skipped", error.message);
    return "";
  }
};

export const parseProjectBriefForRag = async (brief) => {
  if (!brief?.key) return null;
  try {
    const buffer = await getAttachmentBuffer(brief.key);
    const isPdf = brief.mimetype === "application/pdf" || brief.name?.toLowerCase().endsWith(".pdf");
    const parsed = isPdf ? await parsePdf(buffer) : await parseDocx(buffer);
    return {
      filename: brief.name,
      text: parsed.text,
      tables: parsed.tables,
      imageInsights: await describeImages(parsed.images),
    };
  } catch (error) {
    console.warn("Project brief retrieval skipped", error.message);
    return { filename: brief.name, unavailable: true };
  }
};
