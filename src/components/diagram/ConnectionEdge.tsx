import { useCallback } from "react";
import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { useDiagramStore } from "../../store/diagramStore";
import { useSimulationStore } from "../../store/simulationStore";
import { getPinKey } from "../../utils/arduinoPins";
import "../styles/ConnectionEdge.css";

export default function ConnectionEdge(props: EdgeProps<any>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    selected,
    sourcePosition,
    targetPosition,
    data,
  } = props;

  const { selectEdge } = useDiagramStore();
  const { pinStates, isRunning } = useSimulationStore();
  const { nodes } = useDiagramStore();

  const isFlowing = useCallback(() => {
    if (!isRunning || !props.sourceHandleId) return false;
    const sourceNode = nodes.find(n => n.id === props.source);
    if (sourceNode?.data.componentId === "arduino-uno") {
      const pinKey = getPinKey(props.sourceHandleId);
      return pinKey ? !!pinStates[pinKey] : false;
    }
    return false;
  }, [isRunning, props.source, props.sourceHandleId, nodes, pinStates]);

  const active = isFlowing();

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleClick = () => {
    selectEdge(id);
  };

  return (
    <g onClick={handleClick} className="connection-edge-group">
      <BaseEdge
        id={id}
        path={edgePath}
        className={`connection-edge ${selected ? "selected" : ""} ${active ? "is-flowing" : ""}`}
      />
      {data?.label && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2 - 10}
          className="edge-label"
          textAnchor="middle"
        >
          {data.label}
        </text>
      )}
    </g>
  );
}
