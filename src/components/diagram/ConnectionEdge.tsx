import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { useDiagramStore } from "../../store/diagramStore";
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
        className={`connection-edge ${selected ? "selected" : ""}`}
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
