const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
const DATA_FILE = path.join(DATA_DIR, "ai_sessions.json");
const MAX_HISTORY = 40;

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ sessions: {} }, null, 2), "utf-8");
  }
}

function readStore() {
  ensureStore();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { sessions: {} };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function getHistory(sessionId) {
  if (!sessionId) return [];
  const store = readStore();
  const session = store.sessions[sessionId];
  if (!session || !Array.isArray(session.history)) return [];
  return session.history;
}

function appendTurn(sessionId, role, content) {
  if (!sessionId || !role || !content) return;
  const store = readStore();
  if (!store.sessions[sessionId]) {
    store.sessions[sessionId] = {
      createdAt: new Date().toISOString(),
      history: [],
    };
  }
  store.sessions[sessionId].history.push({
    role,
    content,
    timestamp: new Date().toISOString(),
  });
  if (store.sessions[sessionId].history.length > MAX_HISTORY) {
    store.sessions[sessionId].history = store.sessions[sessionId].history.slice(-MAX_HISTORY);
  }
  store.sessions[sessionId].updatedAt = new Date().toISOString();
  writeStore(store);
}

module.exports = {
  getHistory,
  appendTurn,
};
