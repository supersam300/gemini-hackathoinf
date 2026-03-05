import { create } from "zustand";
import type { Project, CreateProjectParams } from "../types/project";
import { saveCircuit, loadCircuit } from "../api/circuits";
import { useDiagramStore } from "./diagramStore";
import { useEditorStore } from "./editorStore";
import type { DiagramNode, DiagramEdge } from "../types/diagram";

interface ProjectStore {
  currentProject: Project | null;
  isSaved: boolean;

  // Cloud sync state
  cloudCircuitId: string | null;
  cloudSaving: boolean;
  cloudLoading: boolean;
  cloudError: string | null;

  createProject: (params: CreateProjectParams) => void;
  setCurrentProject: (project: Project | null) => void;
  updateProject: (updates: Partial<Project>) => void;
  setIsSaved: (isSaved: boolean) => void;
  clearProject: () => void;

  // Cloud actions
  saveToCloud: (projectName: string) => Promise<boolean>;
  loadFromCloud: (id: string) => Promise<boolean>;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useProjectStore = create<ProjectStore>((set, get) => ({
  currentProject: null,
  isSaved: true,
  cloudCircuitId: null,
  cloudSaving: false,
  cloudLoading: false,
  cloudError: null,

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

  // ─── Cloud Save ──────────────────────────────────────────
  saveToCloud: async (projectName: string) => {
    set({ cloudSaving: true, cloudError: null });

    try {
      const { nodes, edges } = useDiagramStore.getState();
      const { code, language } = useEditorStore.getState();

      // Transform diagram nodes → components array for MongoDB
      const components = nodes.map((node) => {
        const data = node.data as any;
        return {
          nodeId: node.id,
          type: node.type || "componentNode",
          componentType: data?.componentId || "unknown",
          label: data?.label || "Component",
          position: { x: node.position.x, y: node.position.y },
          properties: data?.properties || {},
          handles: {
            inputs: data?.inputs || [],
            outputs: data?.outputs || [],
          },
        };
      });

      // Transform diagram edges → connections array for MongoDB
      const connections = edges.map((edge) => {
        const edgeData = edge.data as any;
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);
        const sourceData = sourceNode?.data as any;
        const targetData = targetNode?.data as any;

        return {
          edgeId: edge.id,
          from: {
            nodeId: edge.source,
            componentType: sourceData?.componentId || "unknown",
            handle: edgeData?.sourceHandle || edge.sourceHandle || "source",
          },
          to: {
            nodeId: edge.target,
            componentType: targetData?.componentId || "unknown",
            handle: edgeData?.targetHandle || edge.targetHandle || "target",
          },
          type: edge.type || "connection",
        };
      });

      const existingId = get().cloudCircuitId;
      const res = await saveCircuit({
        _id: existingId || undefined,
        projectName,
        code,
        language,
        components,
        connections,
      });

      set({ cloudCircuitId: res.id, cloudSaving: false, isSaved: true });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ cloudSaving: false, cloudError: msg });
      return false;
    }
  },

  // ─── Cloud Load ──────────────────────────────────────────
  loadFromCloud: async (id: string) => {
    set({ cloudLoading: true, cloudError: null });

    try {
      const res = await loadCircuit(id);
      const { circuit } = res;

      // Restore nodes from components
      const restoredNodes: DiagramNode[] = circuit.components.map((comp) => {
        return {
          id: comp.nodeId,
          type: comp.type || "componentNode",
          position: { x: comp.position.x, y: comp.position.y },
          data: {
            componentId: comp.componentType,
            label: comp.label,
            properties: comp.properties || {},
            inputs: comp.handles?.inputs || [],
            outputs: comp.handles?.outputs || [],
          },
        };
      });

      // Restore edges from connections
      const restoredEdges: DiagramEdge[] = circuit.connections.map((conn) => ({
        id: conn.edgeId,
        source: conn.from.nodeId,
        target: conn.to.nodeId,
        sourceHandle: conn.from.handle,
        targetHandle: conn.to.handle,
        type: conn.type || "connection",
        data: {
          sourceHandle: conn.from.handle,
          targetHandle: conn.to.handle,
        },
      }));

      // Update diagram store
      const diagramStore = useDiagramStore.getState();
      diagramStore.setNodes(restoredNodes);
      diagramStore.setEdges(restoredEdges);

      // Update editor store
      const editorStore = useEditorStore.getState();
      editorStore.setCode(circuit.code || "");
      editorStore.setLanguage(circuit.language || "cpp");
      editorStore.setHasChanges(false);

      set({
        cloudCircuitId: circuit._id,
        cloudLoading: false,
        isSaved: true,
      });

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ cloudLoading: false, cloudError: msg });
      return false;
    }
  },
}));
