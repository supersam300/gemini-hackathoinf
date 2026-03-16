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

function resolveModelForSession({ requestedModel, sessionId }) {
  if (requestedModel) {
    return {
      modelResolved: String(requestedModel),
      route: "requested",
      canaryBucket: null,
    };
  }

  const primary =
    process.env.GEMINI_AGENT_MODEL ||
    process.env.GEMINI_MODEL ||
    process.env.OLLAMA_MODEL ||
    "gemini-1.5-flash";
  const candidate =
    process.env.GEMINI_AGENT_MODEL_CANDIDATE ||
    process.env.OLLAMA_MODEL_CANDIDATE ||
    "";
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
