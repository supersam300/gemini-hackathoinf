import { useCallback, useMemo } from "react";
import { useDiagramStore } from "../store/diagramStore";

/**
 * Custom hook for diagram-related utilities and helpers
 *
 * Provides convenient methods to work with the diagram store
 */
export const useDiagram = () => {
  const {
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    addNode,
    removeNode,
    updateNode,
    addEdge,
    removeEdge,
    selectNode,
    selectEdge,
  } = useDiagramStore();

  // Memoized counts
  const nodeCount = useMemo(() => nodes.length, [nodes]);
  const edgeCount = useMemo(() => edges.length, [edges]);

  // Memoized selected items
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId),
    [edges, selectedEdgeId]
  );

  /**
   * Check if a node has any connections
   */
  const hasConnections = useCallback(
    (nodeId: string) =>
      edges.some((e) => e.source === nodeId || e.target === nodeId),
    [edges]
  );

  /**
   * Get all connections for a specific node
   */
  const getNodeConnections = useCallback(
    (nodeId: string) => edges.filter((e) => e.source === nodeId || e.target === nodeId),
    [edges]
  );

  /**
   * Get all nodes connected to a specific node
   */
  const getConnectedNodes = useCallback(
    (nodeId: string) => {
      const connectedIds = new Set<string>();
      edges.forEach((edge) => {
        if (edge.source === nodeId) connectedIds.add(edge.target);
        if (edge.target === nodeId) connectedIds.add(edge.source);
      });
      return nodes.filter((n) => connectedIds.has(n.id));
    },
    [nodes, edges]
  );

  /**
   * Check if an edge already exists between two nodes
   */
  const hasEdgeBetween = useCallback(
    (sourceId: string, targetId: string) =>
      edges.some((e) => e.source === sourceId && e.target === targetId),
    [edges]
  );

  /**
   * Get node by ID
   */
  const getNode = useCallback(
    (nodeId: string) => nodes.find((n) => n.id === nodeId),
    [nodes]
  );

  /**
   * Get edge by ID
   */
  const getEdge = useCallback(
    (edgeId: string) => edges.find((e) => e.id === edgeId),
    [edges]
  );

  /**
   * Delete a node and all its connections
   */
  const deleteNode = useCallback(
    (nodeId: string) => {
      removeNode(nodeId);
    },
    [removeNode]
  );

  /**
   * Delete an edge
   */
  const deleteEdge = useCallback(
    (edgeId: string) => {
      removeEdge(edgeId);
    },
    [removeEdge]
  );

  /**
   * Duplicate a node at a new position
   */
  const duplicateNode = useCallback(
    (nodeId: string, offsetX = 50, offsetY = 50) => {
      const node = getNode(nodeId);
      if (!node) return;

      const newNode = {
        ...node,
        id: `${node.id}_copy_${Date.now()}`,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
      };
      addNode(newNode);
      return newNode;
    },
    [getNode, addNode]
  );

  /**
   * Clear all nodes and edges (reset diagram)
   */
  const clearDiagram = useCallback(() => {
    nodes.forEach((node) => removeNode(node.id));
  }, [nodes, removeNode]);

  /**
   * Get diagram statistics
   */
  const statistics = useMemo(
    () => ({
      totalNodes: nodeCount,
      totalEdges: edgeCount,
      selectedNodes: selectedNodeId ? 1 : 0,
      selectedEdges: selectedEdgeId ? 1 : 0,
      avgConnectionsPerNode:
        nodeCount > 0 ? (edgeCount * 2) / nodeCount : 0,
    }),
    [nodeCount, edgeCount, selectedNodeId, selectedEdgeId]
  );

  return {
    // Store data
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    selectedNode,
    selectedEdge,

    // Store actions
    addNode,
    removeNode,
    updateNode,
    addEdge,
    removeEdge,
    selectNode,
    selectEdge,

    // Counts
    nodeCount,
    edgeCount,

    // Queries
    hasConnections,
    getNodeConnections,
    getConnectedNodes,
    hasEdgeBetween,
    getNode,
    getEdge,

    // Actions
    deleteNode,
    deleteEdge,
    duplicateNode,
    clearDiagram,

    // Statistics
    statistics,
  };
};
