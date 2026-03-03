import { create } from "zustand";
import type { Project, CreateProjectParams } from "../types/project";

interface ProjectStore {
  currentProject: Project | null;
  isSaved: boolean;

  createProject: (params: CreateProjectParams) => void;
  setCurrentProject: (project: Project | null) => void;
  updateProject: (updates: Partial<Project>) => void;
  setIsSaved: (isSaved: boolean) => void;
  clearProject: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useProjectStore = create<ProjectStore>((set) => ({
  currentProject: null,
  isSaved: true,

  createProject: (params) => {
    const now = Date.now();
    const newProject: Project = {
      id: generateId(),
      name: params.name,
      description: params.description,
      code: "",
      language: params.language || "cpp",
      diagram: {
        nodes: [],
        edges: [],
        selectedNodeId: null,
        selectedEdgeId: null,
      },
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    set({ currentProject: newProject, isSaved: false });
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  updateProject: (updates) =>
    set((state) => ({
      currentProject: state.currentProject
        ? { ...state.currentProject, ...updates, updatedAt: Date.now() }
        : null,
      isSaved: false,
    })),

  setIsSaved: (isSaved) => set({ isSaved }),

  clearProject: () =>
    set({
      currentProject: null,
      isSaved: true,
    }),
}));
