function hashToPercent(input) {
  const value = String(input || "");
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = Math.abs(hash % 10000) / 100;
  return normalized; // 0..99.99
}

function normalizeRequestedModel(model) {
  const raw = String(model || "").trim();
  if (!raw) return "";
  const configuredGeminiModel =
    process.env.GEMINI_AGENT_MODEL ||
    process.env.GEMINI_MODEL ||
    "gemini-2.5-flash";

  // Frontend/local aliases that are not valid Google GenAI model IDs.
  const aliasMap = {
    "gemma3:latest": configuredGeminiModel,
    "gemma3:4b": configuredGeminiModel,
    "gemma3:12b": configuredGeminiModel,
    "models/gemma3:latest": configuredGeminiModel,
    "huggingface/google/gemma-3-4b-it": configuredGeminiModel,
    "google/gemma-3-4b-it": configuredGeminiModel,
  };

  const normalized = aliasMap[raw.toLowerCase()];
  if (normalized) return normalized;
  return raw;
}

function resolveModelForSession({ requestedModel, sessionId }) {
  if (requestedModel) {
    return {
      modelResolved: normalizeRequestedModel(requestedModel),
      route: "requested",
      canaryBucket: null,
    };
  }

  const primary = normalizeRequestedModel(
    process.env.GEMINI_AGENT_MODEL ||
    process.env.GEMINI_MODEL ||
    process.env.OLLAMA_MODEL ||
    "gemini-1.5-flash"
  );
  const candidate = normalizeRequestedModel(
    process.env.GEMINI_AGENT_MODEL_CANDIDATE ||
    process.env.OLLAMA_MODEL_CANDIDATE ||
    ""
  );
  const canaryPercent = Number(
    process.env.GEMINI_AGENT_CANARY_PERCENT ||
    process.env.OLLAMA_CANARY_PERCENT ||
    0
  );

  if (!candidate || Number.isNaN(canaryPercent) || canaryPercent <= 0) {
    return {
      modelResolved: primary,
      route: "primary",
      canaryBucket: null,
    };
  }

  const bucket = hashToPercent(sessionId || "anonymous");
  const useCanary = bucket < Math.min(100, Math.max(0, canaryPercent));
  return {
    modelResolved: useCanary ? candidate : primary,
    route: useCanary ? "canary" : "primary",
    canaryBucket: bucket,
  };
}

module.exports = {
  resolveModelForSession,
};
