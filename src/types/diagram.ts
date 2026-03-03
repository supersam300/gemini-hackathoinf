import type { Node, Edge } from "@xyflow/react";

/** Extended node data for circuit components */
export interface ComponentNodeData extends Record<string, unknown> {
  /** Component type ID (e.g., "resistor", "led") */
  componentId: string;
  /** Component label/name as displayed on canvas */
  label: string;
  /** Component instance properties (e.g., resistance value) */
  properties: Record<string, string | number | boolean>;
  /** Connection points for inputs */
  inputs: string[];
  /** Connection points for outputs */
  outputs: string[];
}

/** Circuit diagram node */
export type DiagramNode = Node<ComponentNodeData>;

/** Circuit diagram edge/connection */
export interface DiagramEdgeData extends Record<string, unknown> {
  /** Source node output pin */
  sourceHandle?: string;
  /** Target node input pin */
  targetHandle?: string;
  /** Connection label (e.g., signal name) */
  label?: string;
}

export type DiagramEdge = Edge<DiagramEdgeData>;

/** Represents the entire circuit diagram state */
export interface DiagramState {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
}

/** History entry for undo/redo */
export interface HistoryEntry {
  state: DiagramState;
  timestamp: number;
  description: string;
}
