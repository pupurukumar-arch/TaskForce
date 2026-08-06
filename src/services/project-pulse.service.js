import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Task } from "../models/task.models.js";
import { Subtask } from "../models/subtask.models.js";
import { ProjectNote } from "../models/note.models.js";
import { Activity } from "../models/activity.models.js";
import { connectRedis, getRedisClient } from "../config/redis.js";
import { ApiError } from "../utils/api-error.js";
import { parseProjectBriefForRag } from "./project-brief-rag-parser.service.js";

const CACHE_TTL_SECONDS = 300;
const MAX_TASKS_IN_CONTEXT = 150;
const text = (value, max = 280) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
const date = (value) => (value ? new Date(value).toISOString().slice(0, 10) : null);
const displayName = (user) => user?.fullName || user?.username || "Unassigned";

const projectPulseCacheKey = (projectId) => `taskforce:project-pulse:context:${projectId}`;

const readCachedContext = async (projectId) => {
  const client = getRedisClient();
  if (!client) return null;
  try {
    await connectRedis();
    const cached = await client.get(projectPulseCacheKey(projectId));
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Project Pulse cache read skipped", error.message);
    return null;
  }
};

const cacheContext = async (projectId, context) => {
  const client = getRedisClient();
  if (!client) return;
  try {
    await connectRedis();
    await client.set(projectPulseCacheKey(projectId), JSON.stringify(context), {
      EX: CACHE_TTL_SECONDS,
    });
  } catch (error) {
    console.warn("Project Pulse cache write skipped", error.message);
  }
};

export const getProjectPulseContext = async (projectId) => {
  const cached = await readCachedContext(projectId);
  if (cached) return cached;

  const project = await Project.findById(projectId).lean();
  if (!project) throw new ApiError(404, "Project not found");

  const [members, tasks, notes, activities, briefRetrieval] = await Promise.all([
    ProjectMember.find({ project: projectId }).populate("user", "username fullName").lean(),
    Task.find({ project: projectId })
      .populate("assignedTo", "username fullName")
      .sort({ createdAt: -1 })
      .limit(MAX_TASKS_IN_CONTEXT)
      .lean(),
    ProjectNote.find({ project: projectId }).sort({ updatedAt: -1 }).limit(10).lean(),
    Activity.find({ project: projectId })
      .populate("actor", "username fullName")
      .sort({ createdAt: -1 })
      .limit(25)
      .lean(),
    parseProjectBriefForRag(project.brief),
  ]);

  const subtasks = tasks.length
    ? await Subtask.find({ task: { $in: tasks.map((task) => task._id) } }).lean()
    : [];
  const subtasksByTask = new Map();
  for (const subtask of subtasks) {
    const key = String(subtask.task);
    subtasksByTask.set(key, [...(subtasksByTask.get(key) || []), subtask]);
  }

  const now = new Date();
  const memberStats = new Map(
    members.map((member) => [String(member.user?._id), {
      teammate: displayName(member.user),
      assigned: 0,
      overdue: 0,
      completedOnTime: 0,
      completedLate: 0,
      missedDeadlineCount: 0,
    }]),
  );
  const compactTasks = tasks.map((task) => {
    const assigneeId = String(task.assignedTo?._id || "");
    const stats = memberStats.get(assigneeId);
    const isDone = task.status === "done";
    const isOverdue = Boolean(task.dueDate) && !isDone && new Date(task.dueDate) < now;
    const completedLate = Boolean(task.dueDate && task.approvedAt) && new Date(task.approvedAt) > new Date(task.dueDate);
    const completedOnTime = isDone && Boolean(task.dueDate && task.approvedAt) && !completedLate;
    if (stats) {
      stats.assigned += 1;
      if (isOverdue) stats.overdue += 1;
      if (completedLate) stats.completedLate += 1;
      if (completedOnTime) stats.completedOnTime += 1;
      if (isOverdue || completedLate) stats.missedDeadlineCount += 1;
    }
    const taskSubtasks = subtasksByTask.get(String(task._id)) || [];
    return {
      title: text(task.title, 140),
      assignee: displayName(task.assignedTo),
      status: task.status,
      priority: task.priority,
      deadline: date(task.dueDate),
      created: date(task.createdAt),
      completed: date(task.approvedAt),
      subtasks: taskSubtasks.map((subtask) => ({ title: text(subtask.title, 100), complete: subtask.isCompleted })),
    };
  });

  const context = {
    project: {
      name: text(project.name, 160),
      description: text(project.description, 1000),
      brief: project.brief?.name ? {
        uploaded: true,
        name: text(project.brief.name, 160),
        retrieval: briefRetrieval,
      } : { uploaded: false },
    },
    contextNote: tasks.length === MAX_TASKS_IN_CONTEXT
      ? `Task detail is capped at the ${MAX_TASKS_IN_CONTEXT} most recent tasks; totals remain project-scoped.`
      : "All current project tasks are represented below.",
    teammateSummary: [...memberStats.values()],
    tasks: compactTasks,
    recentNotes: notes.map((note) => ({ content: text(note.content, 350), updated: date(note.updatedAt) })),
    recentActivity: activities.map((activity) => ({
      actor: displayName(activity.actor),
      type: text(activity.type, 80),
      message: text(activity.message, 300),
      date: date(activity.createdAt),
    })),
  };

  await cacheContext(projectId, context);
  return context;
};

export const buildProjectPulsePrompt = ({ context, question }) => `You are Project Pulse, a precise project-management analyst. Answer only about the single project in the supplied context. Do not use outside knowledge or invent facts. If the context does not contain enough evidence, say exactly: "I don't have enough information." Reference actual teammate names, task titles, statuses, and dates where they exist. Keep the answer concise and useful for a Project Admin.\n\nPROJECT CONTEXT:\n${JSON.stringify(context)}\n\nQUESTION:\n${question}`;

const extractGeminiText = (payload) =>
  payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") ||
  (payload?.event_type === "content.delta" && payload?.delta?.type === "text" ? payload.delta.text : "");

export const streamGeminiAnswer = async ({ prompt, onToken, signal }) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new ApiError(503, "Project Pulse is not configured yet");
  }
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 450 },
      }),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 429) throw new ApiError(429, "Gemini is rate-limited. Please try again shortly.");
    console.error("Gemini Project Pulse error", response.status, detail.slice(0, 500));
    throw new ApiError(502, "Project Pulse could not generate an answer right now");
  }

  const answer = extractGeminiText(await response.json());
  if (!answer) throw new ApiError(502, "Project Pulse returned an empty answer. Please try again.");
  onToken(answer);
};
