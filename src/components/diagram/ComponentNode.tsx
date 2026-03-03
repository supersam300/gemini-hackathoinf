import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useDiagramStore } from "../../store/diagramStore";
import { COMPONENTS } from "../../constants/components";
import "../styles/ComponentNode.css";

export default function ComponentNode(props: NodeProps<any>) {
  const { data, selected, id } = props;
  const { selectNode } = useDiagramStore();
  const componentDef = COMPONENTS.find((c) => c.id === data?.componentId);

  if (!componentDef) {
    return <div>Unknown component</div>;
  }

  const handleClick = () => {
    selectNode(id);
  };

  return (
    <div
      className={`component-node ${selected ? "selected" : ""}`}
      onClick={handleClick}
    >
      {/* Input handles */}
      {data?.inputs?.map((input: string, index: number) => (
        <Handle
          key={`input-${index}`}
          type="target"
          position={Position.Left}
          id={input}
          style={{
            top: `${((index + 1) / ((data?.inputs?.length || 0) + 1)) * 100}%`,
          }}
          title={input}
        />
      ))}

      {/* Component display */}
      <div className="component-content">
        <div className="component-icon">{componentDef.icon}</div>
        <div className="component-label">{data?.label}</div>
      </div>

      {/* Output handles */}
      {data?.outputs?.map((output: string, index: number) => (
        <Handle
          key={`output-${index}`}
          type="source"
          position={Position.Right}
          id={output}
          style={{
            top: `${((index + 1) / ((data?.outputs?.length || 0) + 1)) * 100}%`,
          }}
          title={output}
        />
      ))}
    </div>
  );
}
