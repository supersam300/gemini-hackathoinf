import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useDiagramStore } from "../../store/diagramStore";
import { COMPONENTS } from "../../constants/components";
import ComponentNode from "./ComponentNode";
import ConnectionEdge from "./ConnectionEdge";
import type { DiagramNode, DiagramEdge } from "../../types/diagram";

const nodeTypes = { componentNode: ComponentNode as any };
const edgeTypes = { connection: ConnectionEdge as any };

export default function Canvas() {
  const { nodes: storeNodes, edges: storeEdges } = useDiagramStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(
    (storeNodes as Node[]) || []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    (storeEdges as Edge[]) || []
  );

  const {
    addNode,
    addEdge: addDiagramEdge,
    selectNode,
    selectEdge,
  } = useDiagramStore();

  // refs for the container and the flow instance used when dropping nodes
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [rfInstance, setRfInstance] = useState<any>(null);

  const onInit = useCallback((instance: any) => {
    setRfInstance(instance);
  }, []);

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const edge: DiagramEdge = {
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        type: "connection",
        data: {
          sourceHandle: connection.sourceHandle || undefined,
          targetHandle: connection.targetHandle || undefined,
        },
      };

      setEdges((eds) => addEdge(connection, eds));
      addDiagramEdge(edge);
    },
    [setEdges, addDiagramEdge]
  );

  // Handle drop to add component (only when dragging from palette)
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const types = Array.from(event.dataTransfer.types || []);
    if (!types.includes("application/componentId")) {
      // allow normal ReactFlow behavior (node dragging, selection, etc.)
      return;
    }
    event.preventDefault();
    // explorer sets effectAllowed = "copy" so we must mirror that here
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const componentId = event.dataTransfer.getData("application/componentId");
      if (!componentId) return;
      const componentDef = COMPONENTS.find((c) => c.id === componentId);
      if (!componentDef || !wrapperRef.current) return;

      const rect = wrapperRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const position = rfInstance ? rfInstance.project({ x, y }) : { x, y };

      const newNode: DiagramNode = {
        id: `node-${componentId}-${Date.now()}`,
        type: "componentNode",
        position,
        data: {
          componentId,
          label: componentDef.name,
          properties: {},
          inputs: Array(componentDef.inputs)
            .fill(0)
            .map((_, i) => `in-${i}`),
          outputs: Array(componentDef.outputs)
            .fill(0)
            .map((_, i) => `out-${i}`),
        },
      };

      setNodes((n) => [...n, newNode]);
      addNode(newNode);
    },
    [setNodes, addNode, rfInstance]
  );

  // Handle node/edge selection
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.stopPropagation();
      selectNode(node.id);
    },
    [selectNode]
  );

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  // Sync node position changes back to store
  const handleNodesChange = useCallback(
    (changes: any[]) => {
      onNodesChange(changes);

      // Sync position updates to store
      changes.forEach((change: any) => {
        if (change.type === "position" && change.position) {
          const { updateNode } = useDiagramStore.getState();
          const nodeToUpdate = nodes.find((n) => n.id === change.id);
          if (nodeToUpdate) {
            updateNode(change.id, {
              position: change.position,
            });
          }
        } else if (change.type === "select") {
          const { selectNode } = useDiagramStore.getState();
          selectNode(change.selected ? change.id : null);
        }
      });
    },
    [onNodesChange, nodes]
  );

  // Sync store updates to local state
  const onNodesDelete = useCallback(
    (deletedNodes: any[]) => {
      deletedNodes.forEach((node) => {
        useDiagramStore.getState().removeNode(node.id);
      });
    },
    []
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      deletedEdges.forEach((edge) => {
        useDiagramStore.getState().removeEdge(edge.id);
      });
    },
    []
  );

  return (
    <div
      ref={wrapperRef}
      style={{ width: "100%", height: "100%" }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={onInit}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodesDraggable={true}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        deleteKeyCode="Delete"
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
