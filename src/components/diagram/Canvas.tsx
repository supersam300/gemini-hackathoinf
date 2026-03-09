import { useCallback, useRef, useState, useEffect } from "react";
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
  const [draggingOver, setDraggingOver] = useState(false);

  const onInit = useCallback((instance: any) => {
    setRfInstance(instance);
    console.log("rfInstance onInit", Object.keys(instance));
  }, []);

  // Resync local React Flow state when the Zustand store changes
  // (e.g. after loading a circuit from MongoDB)
  useEffect(() => {
    setNodes((storeNodes as Node[]) || []);
  }, [storeNodes]);

  useEffect(() => {
    setEdges((storeEdges as Edge[]) || []);
  }, [storeEdges]);

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
  // simpler drag-over handler – always prevent default so drops are allowed
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    console.log("canvas onDragOver", {
      target: event.target,
      types: Array.from(event.dataTransfer.types || []),
      compId: event.dataTransfer.getData("application/componentId"),
    });
    setDraggingOver(true);
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDraggingOver(false);
      console.log("canvas onDrop", {
        target: event.target,
        types: Array.from(event.dataTransfer.types || []),
        compId: event.dataTransfer.getData("application/componentId"),
      });

      const componentId = event.dataTransfer.getData("application/componentId");
      if (!componentId) return;
      const componentDef = COMPONENTS.find((c) => c.id === componentId);
      console.log("componentDef from drop", componentDef);
      if (!componentDef || !wrapperRef.current) return;

      const rect = wrapperRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      let position;
      if (rfInstance && typeof rfInstance.getViewport === "function") {
        const vp = rfInstance.getViewport();
        position = {
          x: (x - vp.x) / vp.zoom,
          y: (y - vp.y) / vp.zoom,
        };
        console.log("viewport", vp);
      } else {
        position = { x, y };
      }
      console.log("computed drop position", position);

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

      setNodes((n) => {
        const result = [...n, newNode];
        console.log("nodes after setNodes", result);
        return result;
      });
      addNode(newNode);
      if (rfInstance) {
        // make sure the new node is visible
        try {
          rfInstance.fitView({ padding: 0.2, nodes: [newNode] });
        } catch (e) {
          console.warn("fitView failed", e);
        }
      } else {
        console.log("rfInstance not available for fitView");
      }
    },
    [setNodes, addNode]
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

  // global listeners to observe dragging anywhere on window (for debugging)
  useEffect(() => {
    const handle = (ev: DragEvent) => {
      console.log("window drag event", ev.type, ev.target, ev.dataTransfer ? Array.from(ev.dataTransfer.types) : []);
    };
    window.addEventListener("dragover", handle);
    window.addEventListener("drop", handle);
    return () => {
      window.removeEventListener("dragover", handle);
      window.removeEventListener("drop", handle);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`w-full h-full ${draggingOver ? 'border-4 border-blue-400' : ''}`}
      onDragOverCapture={onDragOver}
      onDropCapture={onDrop}
      onDragLeaveCapture={() => setDraggingOver(false)}
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
        nodesDraggable={true}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        deleteKeyCode="Delete"
        fitView
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor="#667eea"
          nodeStrokeColor="#334155"
          nodeBorderRadius={4}
          maskColor="rgba(15, 23, 42, 0.7)"
          style={{ backgroundColor: "#1e293b" }}
        />
      </ReactFlow>
    </div>
  );
}
