#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const {
  getRecentTelemetry,
  getRecentFeedback,
} = require("../../server/services/aiTelemetryStore");

function parseArgs(argv) {
  const out = {
    output: "server/data/training/agent_sft.jsonl",
    minCompletion: 0.8,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--output") out.output = argv[i + 1];
    if (token === "--min-completion") out.minCompletion = Number(argv[i + 1]);
  }
  return out;
}

function toJsonlLine(item) {
  return JSON.stringify(item);
}

function buildExample(event, correctedActions) {
  const actions = correctedActions || event.actions;
  if (!Array.isArray(actions) || actions.length === 0) return null;
  const prompt = event.prompt || event.promptPreview;
  if (!prompt) return null;
  return {
    instruction: String(prompt),
    input: {
      canvasState: event.canvasState || {},
      mode: event.mode || "default",
    },
    output: {
      text: "Applied requested changes.",
      actions,
    },
    metadata: {
      eventId: event.eventId,
      modelResolved: event.modelResolved || null,
      source: correctedActions ? "user-corrected" : "accepted-telemetry",
      createdAt: event.createdAt,
    },
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const telemetry = getRecentTelemetry(0);
  const feedback = getRecentFeedback(0);
  const feedbackByEvent = new Map(feedback.map((f) => [String(f.eventId), f]));

  const selected = [];
  for (const event of telemetry) {
    const score = Number(event.taskCompletionHeuristic || 0);
    if (!event.success) continue;
    if (score < args.minCompletion) continue;

    const fb = feedbackByEvent.get(String(event.eventId || ""));
    if (fb && fb.outcome === "rejected") continue;
    const correctedActions = fb && fb.outcome === "corrected" && Array.isArray(fb.correctedActions)
      ? fb.correctedActions
      : null;

    const example = buildExample(event, correctedActions);
    if (example) selected.push(example);
  }

  const outputPath = path.isAbsolute(args.output)
    ? args.output
    : path.join(process.cwd(), args.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, selected.map(toJsonlLine).join("\n"), "utf-8");

  console.log(JSON.stringify({
    success: true,
    outputPath,
    examples: selected.length,
    note: "If examples are 0, enable AI_TELEMETRY_STORE_RAW_PROMPT/RAW_ACTIONS and collect more sessions.",
  }, null, 2));
}

main();
