// ─── Application Info ─────────────────────────────────────
export const APP_NAME = "SimuIDE Web";
export const APP_VERSION = "0.1.0";

// ─── Layout ────────────────────────────────────────────────
export const AGENT_PANEL_WIDTH = 300;
export const HEADER_HEIGHT = 44;

// ─── Auto-Save ────────────────────────────────────────────
export const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds

// ─── API & Environment ────────────────────────────────────
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";
export const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || "info";

// ─── Canvas Settings ──────────────────────────────────────
export const CANVAS_GRID_SIZE = 20;
export const CANVAS_ZOOM_MIN = 0.1;
export const CANVAS_ZOOM_MAX = 2;
export const CANVAS_DEFAULT_ZOOM = 1;
export const CANVAS_PADDING = 50; // pixels

// ─── Editor Settings ──────────────────────────────────────
export const EDITOR_FONT_SIZE = 14;
export const EDITOR_LINE_HEIGHT = 1.6;
export const EDITOR_THEME = "vs-dark";
export const EDITOR_LANGUAGE_DEFAULT = "cpp";

// ─── Simulation ────────────────────────────────────────────
export const SIMULATION_TICK_RATE = 1000; // ms
export const MAX_SIMULATION_TIME = 60000; // 60 seconds
export const MAX_NODES = 100;
export const MAX_EDGES = 200;

// ─── Storage Keys ─────────────────────────────────────────
export const STORAGE_KEY_PROJECT = "simulide_project";
export const STORAGE_KEY_RECENT_PROJECTS = "simulide_recent_projects";
export const STORAGE_KEY_USER_SETTINGS = "simulide_user_settings";
export const STORAGE_KEY_DRAFTS = "simulide_drafts";

// ─── Validation ────────────────────────────────────────────
export const MAX_PROJECT_NAME_LENGTH = 100;
export const MIN_PROJECT_NAME_LENGTH = 1;
export const MAX_CODE_LENGTH = 100000; // characters
export const MAX_DESCRIPTION_LENGTH = 500;
