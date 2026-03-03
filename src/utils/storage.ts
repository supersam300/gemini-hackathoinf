import type { Project } from "../types/project";
import { STORAGE_KEY_PROJECT, STORAGE_KEY_RECENT_PROJECTS } from "../constants/config";

/**
 * LocalStorage utilities for persisting projects and diagrams
 */
export const storage = {
  /**
   * Save a project to localStorage
   */
  saveProject: (project: Project): void => {
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PROJECT}_${project.id}`,
        JSON.stringify(project)
      );
    } catch (error) {
      console.error("Failed to save project:", error);
    }
  },

  /**
   * Load a project from localStorage
   */
  loadProject: (projectId: string): Project | null => {
    try {
      const data = localStorage.getItem(`${STORAGE_KEY_PROJECT}_${projectId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to load project:", error);
      return null;
    }
  },

  /**
   * Delete a project from localStorage
   */
  deleteProject: (projectId: string): void => {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PROJECT}_${projectId}`);
      storage.removeRecentProject(projectId);
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  },

  /**
   * Get all projects from localStorage
   */
  getAllProjects: (): Project[] => {
    try {
      const projects: Project[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PROJECT)) {
          const data = localStorage.getItem(key);
          if (data) {
            projects.push(JSON.parse(data));
          }
        }
      }
      return projects;
    } catch (error) {
      console.error("Failed to get all projects:", error);
      return [];
    }
  },

  /**
   * Save a project ID to recent projects list
   */
  saveRecentProject: (projectId: string): void => {
    try {
      const recent = storage.getRecentProjects();
      const filtered = recent.filter((id) => id !== projectId);
      filtered.unshift(projectId);
      localStorage.setItem(
        STORAGE_KEY_RECENT_PROJECTS,
        JSON.stringify(filtered.slice(0, 10))
      );
    } catch (error) {
      console.error("Failed to save recent project:", error);
    }
  },

  /**
   * Get list of recent project IDs
   */
  getRecentProjects: (): string[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY_RECENT_PROJECTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Failed to get recent projects:", error);
      return [];
    }
  },

  /**
   * Remove a project from recent list
   */
  removeRecentProject: (projectId: string): void => {
    try {
      const recent = storage.getRecentProjects();
      const filtered = recent.filter((id) => id !== projectId);
      localStorage.setItem(STORAGE_KEY_RECENT_PROJECTS, JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to remove recent project:", error);
    }
  },

  /**
   * Clear all data from localStorage
   */
  clearAll: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error("Failed to clear storage:", error);
    }
  },
};
