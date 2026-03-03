import type { DiagramState } from "./diagram";

/** Represents a complete project state */
export interface Project {
  /** Unique project identifier */
  id: string;
  /** Project name */
  name: string;
  /** Project description */
  description?: string;
  /** Circuit diagram state */
  diagram: DiagramState;
  /** Code editor content */
  code: string;
  /** Programming language (e.g., "c", "cpp") */
  language: "c" | "cpp" | "python";
  /** Project creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
  /** Version number for tracking changes */
  version: number;
}

/** Project metadata for list display */
export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  componentCount: number;
  codeLines: number;
}

/** Project creation parameters */
export interface CreateProjectParams {
  name: string;
  description?: string;
  language?: "c" | "cpp" | "python";
}
