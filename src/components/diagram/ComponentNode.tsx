import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useRef, useEffect } from "react";
import { useDiagramStore } from "../../store/diagramStore";
import { COMPONENTS } from "../../constants/components";
import "@wokwi/elements";
import "../styles/ComponentNode.css";

function WokwiElement({ tag }: { tag: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && !ref.current.querySelector(tag)) {
      ref.current.innerHTML = "";
      const el = document.createElement(tag);
      ref.current.appendChild(el);
    }
  }, [tag]);
  return <div ref={ref} className="wokwi-element-wrapper" />;
}

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

  const hasWokwi = !!componentDef.wokwiTag;

  return (
    <div
      className={`component-node ${selected ? "selected" : ""} ${hasWokwi ? "has-wokwi" : ""}`}
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
        {hasWokwi ? (
          <WokwiElement tag={componentDef.wokwiTag!} />
        ) : (
          <div className="component-icon">{componentDef.icon}</div>
        )}
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
