const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "../data");
const TELEMETRY_FILE = path.join(DATA_DIR, "ai_telemetry.jsonl");
const FEEDBACK_FILE = path.join(DATA_DIR, "ai_feedback.jsonl");

const VALID_ACTION_TYPES = new Set([
  "PLACE_COMPONENT",
  "ADD_WIRE",
  "DELETE_COMPONENT",
  "DELETE_WIRE",
  "UPDATE_CODE",
  "VERIFY_BUILD",
  "START_SIMULATION",
  "STOP_SIMULATION",
]);

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TELEMETRY_FILE)) {
    fs.writeFileSync(TELEMETRY_FILE, "", "utf-8");
  }
  if (!fs.existsSync(FEEDBACK_FILE)) {
    fs.writeFileSync(FEEDBACK_FILE, "", "utf-8");
  }
}

function nowIso() {
  return new Date().toISOString();
}

function hashText(text) {
  return crypto.createHash("sha256").update(String(text || "")).digest("hex");
}

function parseJsonLines(filePath) {
  ensureStore();
  const raw = fs.readFileSync(filePath, "utf-8");
  if (!raw.trim()) return [];
  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line));
    } catch {
      // Ignore malformed lines rather than crashing telemetry reads.
    }
  }
  return out;
}

function appendJsonLine(filePath, payload) {
  ensureStore();
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf-8");
}

function actionType(action) {
  return String(action?.type || "").toUpperCase();
}

function actionHasRequiredFields(action) {
  const type = actionType(action);
  if (!VALID_ACTION_TYPES.has(type)) return false;
  if (type === "PLACE_COMPONENT") {
    return Boolean(action?.componentType);
  }
  if (type === "ADD_WIRE") {
    return Boolean(action?.from && action?.to);
  }
  if (type === "UPDATE_CODE") {
    return typeof action?.code === "string";
  }
  return true;
}

function refFromEndpoint(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.includes(":")) return raw.split(":", 1)[0].trim().toLowerCase();
  if (raw.includes(".")) return raw.split(".", 1)[0].trim().toLowerCase();
  return raw.toLowerCase();
}

function collectCanvasRefs(canvasState) {
  const refs = new Set();
  const components = Array.isArray(canvasState?.components) ? canvasState.components : [];
  for (const component of components) {
    if (!component || typeof component !== "object") continue;
    for (const key of ["id", "label", "type", "componentType", "name"]) {
      const value = String(component[key] || "").trim().toLowerCase();
      if (value) refs.add(value);
    }
  }
  return refs;
}

function collectPlannedRefs(actions) {
  const refs = new Set();
  for (const action of actions || []) {
    if (actionType(action) !== "PLACE_COMPONENT") continue;
    for (const key of ["id", "label", "componentType", "component", "name"]) {
      const value = String(action?.[key] || "").trim().toLowerCase();
      if (value) refs.add(value);
    }
  }
  return refs;
}

function computeActionMetrics(canvasState, actions) {
  const list = Array.isArray(actions) ? actions : [];
  const actionCount = list.length;
  if (actionCount === 0) {
    return {
      actionCount: 0,
      validActionSchemaRate: 1,
      executableWireEndpointRate: 1,
      taskCompletionHeuristic: 0,
    };
  }

  let schemaValid = 0;
  let wireTotal = 0;
  let wireExecutable = 0;
  const knownRefs = collectCanvasRefs(canvasState);
  const plannedRefs = collectPlannedRefs(list);
  const validRefs = new Set([...knownRefs, ...plannedRefs]);

  for (const action of list) {
    if (actionHasRequiredFields(action)) schemaValid += 1;
    if (actionType(action) !== "ADD_WIRE") continue;
    wireTotal += 1;
    const fromRef = refFromEndpoint(action?.from);
    const toRef = refFromEndpoint(action?.to);
    if (fromRef && toRef && validRefs.has(fromRef) && validRefs.has(toRef)) {
      wireExecutable += 1;
    }
  }

  const validActionSchemaRate = schemaValid / actionCount;
  const executableWireEndpointRate = wireTotal > 0 ? wireExecutable / wireTotal : 1;
  const taskCompletionHeuristic = validActionSchemaRate * executableWireEndpointRate;

  return {
    actionCount,
    validActionSchemaRate,
    executableWireEndpointRate,
    taskCompletionHeuristic,
  };
}

function appendTelemetry(event) {
  appendJsonLine(TELEMETRY_FILE, {
    ...event,
    createdAt: event?.createdAt || nowIso(),
  });
}

function appendFeedback(feedback) {
  appendJsonLine(FEEDBACK_FILE, {
    ...feedback,
    createdAt: feedback?.createdAt || nowIso(),
  });
}

function getRecentTelemetry(limit = 200) {
  const rows = parseJsonLines(TELEMETRY_FILE);
  if (limit <= 0) return rows;
  return rows.slice(-limit);
}

function getRecentFeedback(limit = 200) {
  const rows = parseJsonLines(FEEDBACK_FILE);
  if (limit <= 0) return rows;
  return rows.slice(-limit);
}

function summarizeTelemetry(options = {}) {
  const hours = Number(options.hours || 24 * 7);
  const modelFilter = options.model ? String(options.model) : "";
  const sinceMs = Date.now() - (hours * 60 * 60 * 1000);

  const events = parseJsonLines(TELEMETRY_FILE).filter((event) => {
    const createdAt = new Date(event.createdAt || 0).getTime();
    if (!createdAt || createdAt < sinceMs) return false;
    if (modelFilter && String(event.modelResolved || "") !== modelFilter) return false;
    return true;
  });

  const feedbackRows = parseJsonLines(FEEDBACK_FILE).filter((item) => {
    const createdAt = new Date(item.createdAt || 0).getTime();
    return Boolean(createdAt && createdAt >= sinceMs);
  });
  const feedbackByEvent = new Map(feedbackRows.map((item) => [String(item.eventId), item]));

  let successCount = 0;
  let validJsonCount = 0;
  let fallbackCount = 0;
  let schemaRateTotal = 0;
  let wireRateTotal = 0;
  let completionRateTotal = 0;
  let correctedCount = 0;
  let rejectedCount = 0;

  for (const event of events) {
    if (event.success) successCount += 1;
    if (event.validJson !== false) validJsonCount += 1;
    if (event.fallbackUsed) fallbackCount += 1;
    schemaRateTotal += Number(event.validActionSchemaRate || 0);
    wireRateTotal += Number(event.executableWireEndpointRate || 0);
    completionRateTotal += Number(event.taskCompletionHeuristic || 0);

    const fb = feedbackByEvent.get(String(event.eventId || ""));
    const outcome = String(fb?.outcome || "");
    if (outcome === "corrected") correctedCount += 1;
    if (outcome === "rejected") rejectedCount += 1;
  }

  const total = events.length || 1;
  return {
    windowHours: hours,
    totalRequests: events.length,
    successRate: successCount / total,
    validJsonRate: validJsonCount / total,
    fallbackRate: fallbackCount / total,
    avgValidActionSchemaRate: schemaRateTotal / total,
    avgExecutableWireEndpointRate: wireRateTotal / total,
    avgTaskCompletionHeuristic: completionRateTotal / total,
    correctedRate: correctedCount / total,
    rejectedRate: rejectedCount / total,
    model: modelFilter || null,
  };
}

module.exports = {
  TELEMETRY_FILE,
  FEEDBACK_FILE,
  hashText,
  computeActionMetrics,
  appendTelemetry,
  appendFeedback,
  getRecentTelemetry,
  getRecentFeedback,
  summarizeTelemetry,
};
