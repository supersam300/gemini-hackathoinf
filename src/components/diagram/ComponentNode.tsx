import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useRef, useEffect, useState, useCallback } from "react";
import { useDiagramStore } from "../../store/diagramStore";
import { useSimulationStore } from "../../store/simulationStore";
import { COMPONENTS } from "../../constants/components";
import "@wokwi/elements";
import "../styles/ComponentNode.css";

/* ------------------------------------------------------------------ */
/*  Custom SVGs for components lacking a Wokwi element                */
/* ------------------------------------------------------------------ */

const CUSTOM_SVGS: Record<string, React.FC> = {
  wire: () => (
    <svg width="60" height="12" viewBox="0 0 60 12">
      <line x1="0" y1="6" x2="60" y2="6" stroke="#22d3ee" strokeWidth="2.5" />
      <circle cx="2" cy="6" r="3" fill="#22d3ee" />
      <circle cx="58" cy="6" r="3" fill="#22d3ee" />
    </svg>
  ),
  ground: () => (
    <svg width="40" height="44" viewBox="0 0 40 44">
      <line x1="20" y1="0" x2="20" y2="20" stroke="#94a3b8" strokeWidth="2" />
      <line x1="6" y1="20" x2="34" y2="20" stroke="#94a3b8" strokeWidth="2.5" />
      <line x1="11" y1="26" x2="29" y2="26" stroke="#94a3b8" strokeWidth="2" />
      <line x1="16" y1="32" x2="24" y2="32" stroke="#94a3b8" strokeWidth="1.5" />
    </svg>
  ),
  vcc: () => (
    <svg width="40" height="44" viewBox="0 0 40 44">
      <line x1="20" y1="44" x2="20" y2="16" stroke="#f87171" strokeWidth="2" />
      <polygon points="12,18 20,4 28,18" fill="#f87171" />
      <text x="20" y="40" textAnchor="middle" fill="#f87171" fontSize="8" fontWeight="bold">5V</text>
    </svg>
  ),
  capacitor: () => (
    <svg width="50" height="32" viewBox="0 0 50 32">
      <line x1="0" y1="16" x2="19" y2="16" stroke="#a78bfa" strokeWidth="2" />
      <line x1="19" y1="4" x2="19" y2="28" stroke="#a78bfa" strokeWidth="2.5" />
      <line x1="31" y1="4" x2="31" y2="28" stroke="#a78bfa" strokeWidth="2.5" />
      <line x1="31" y1="16" x2="50" y2="16" stroke="#a78bfa" strokeWidth="2" />
    </svg>
  ),
  inductor: () => (
    <svg width="60" height="24" viewBox="0 0 60 24">
      <line x1="0" y1="16" x2="8" y2="16" stroke="#38bdf8" strokeWidth="2" />
      <path d="M8,16 Q14,0 20,16 Q26,0 32,16 Q38,0 44,16 Q50,0 56,16" fill="none" stroke="#38bdf8" strokeWidth="2" />
      <line x1="56" y1="16" x2="60" y2="16" stroke="#38bdf8" strokeWidth="2" />
    </svg>
  ),
  diode: () => (
    <svg width="56" height="28" viewBox="0 0 56 28">
      <line x1="0" y1="14" x2="16" y2="14" stroke="#fb923c" strokeWidth="2" />
      <polygon points="16,4 38,14 16,24" fill="none" stroke="#fb923c" strokeWidth="2" />
      <line x1="38" y1="4" x2="38" y2="24" stroke="#fb923c" strokeWidth="2.5" />
      <line x1="38" y1="14" x2="56" y2="14" stroke="#fb923c" strokeWidth="2" />
    </svg>
  ),
  "transistor-npn": () => (
    <svg width="48" height="56" viewBox="0 0 48 56">
      {/* Base line */}
      <line x1="0" y1="28" x2="18" y2="28" stroke="#4ade80" strokeWidth="2" />
      {/* Vertical bar */}
      <line x1="18" y1="12" x2="18" y2="44" stroke="#4ade80" strokeWidth="2.5" />
      {/* Collector */}
      <line x1="18" y1="18" x2="40" y2="6" stroke="#4ade80" strokeWidth="2" />
      <line x1="40" y1="6" x2="40" y2="0" stroke="#4ade80" strokeWidth="2" />
      {/* Emitter with arrow */}
      <line x1="18" y1="38" x2="40" y2="50" stroke="#4ade80" strokeWidth="2" />
      <line x1="40" y1="50" x2="40" y2="56" stroke="#4ade80" strokeWidth="2" />
      <polygon points="32,48 40,50 36,42" fill="#4ade80" />
    </svg>
  ),
};

/* Pin position configs for custom SVG components */
const CUSTOM_PIN_INFO: Record<string, { name: string; x: number; y: number }[]> = {
  wire:             [{ name: "1", x: 0, y: 6 },   { name: "2", x: 60, y: 6 }],
  ground:           [{ name: "GND", x: 20, y: 0 }],
  vcc:              [{ name: "VCC", x: 20, y: 44 }],
  capacitor:        [{ name: "1", x: 0, y: 16 },  { name: "2", x: 50, y: 16 }],
  inductor:         [{ name: "1", x: 0, y: 16 },  { name: "2", x: 60, y: 16 }],
  diode:            [{ name: "A", x: 0, y: 14 },  { name: "C", x: 56, y: 14 }],
  "transistor-npn": [{ name: "B", x: 0, y: 28 },  { name: "C", x: 40, y: 0 }, { name: "E", x: 40, y: 56 }],
};

/* ------------------------------------------------------------------ */
/*  Wokwi Element wrapper with live property updates                  */
/* ------------------------------------------------------------------ */

interface WokwiElementProps {
  tag: string;
  elementRef: React.MutableRefObject<HTMLElement | null>;
  componentId: string;
}

function WokwiElement({ tag, elementRef, componentId }: WokwiElementProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinStates = useSimulationStore((s) => s.pinStates);
  const isRunning = useSimulationStore((s) => s.isRunning);

  useEffect(() => {
    if (containerRef.current && !containerRef.current.querySelector(tag)) {
      containerRef.current.innerHTML = "";
      const el = document.createElement(tag);
      containerRef.current.appendChild(el);
      elementRef.current = el;
    }
  }, [tag, elementRef]);

  // Wire LED brightness to simulation pin states
  useEffect(() => {
    const el = elementRef.current as any;
    if (!el || componentId !== "led") return;

    if (isRunning) {
      // Check if any HIGH pin is connected — for demo we check common patterns
      const anyHigh = Object.values(pinStates).some(Boolean);
      el.value = anyHigh;
      el.brightness = anyHigh ? 1.0 : 0;
    } else {
      el.value = false;
      el.brightness = 0;
    }
  }, [pinStates, isRunning, elementRef, componentId]);

  return <div ref={containerRef} className="wokwi-element-wrapper" />;
}

/* ------------------------------------------------------------------ */
/*  Main ComponentNode                                                */
/* ------------------------------------------------------------------ */

export default function ComponentNode(props: NodeProps<any>) {
  const { data, selected, id } = props;
  const { selectNode } = useDiagramStore();
  const componentDef = COMPONENTS.find((c) => c.id === data?.componentId);
  const wokwiRef = useRef<HTMLElement | null>(null);
  const [pinPositions, setPinPositions] = useState<{ name: string; x: number; y: number }[]>([]);

  // Read pinInfo from Wokwi element after mount
  const updatePinInfo = useCallback(() => {
    const el = wokwiRef.current as any;
    if (el?.pinInfo) {
      setPinPositions(
        el.pinInfo.map((p: any) => ({ name: p.name, x: p.x, y: p.y }))
      );
    }
  }, []);

  useEffect(() => {
    if (!componentDef?.wokwiTag) return;
    // Wokwi Lit elements render asynchronously; poll briefly for pinInfo
    const timer = setInterval(() => {
      const el = wokwiRef.current as any;
      if (el?.pinInfo) {
        updatePinInfo();
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [componentDef, updatePinInfo]);

  if (!componentDef) {
    return <div>Unknown component</div>;
  }

  const handleClick = () => selectNode(id);
  const hasWokwi = !!componentDef.wokwiTag;
  const CustomSvg = CUSTOM_SVGS[componentDef.id];
  const customPins = CUSTOM_PIN_INFO[componentDef.id];

  // Decide which pin list to use for handles
  const usePinPositioned = hasWokwi && pinPositions.length > 0;
  const useCustomPins = !hasWokwi && customPins && customPins.length > 0;

  return (
    <div
      className={`component-node ${selected ? "selected" : ""}`}
      onClick={handleClick}
    >
      {/* Render either Wokwi element, custom SVG, or fallback emoji */}
      <div className="component-content">
        {hasWokwi ? (
          <WokwiElement tag={componentDef.wokwiTag!} elementRef={wokwiRef} componentId={componentDef.id} />
        ) : CustomSvg ? (
          <div className="custom-svg-wrapper"><CustomSvg /></div>
        ) : (
          <div style={{ fontSize: 24 }}>{componentDef.icon}</div>
        )}
        <div className="component-label">{data?.label}</div>
      </div>

      {/* Pin-positioned handles for Wokwi elements */}
      {usePinPositioned &&
        pinPositions.map((pin, i) => (
          <Handle
            key={`pin-${pin.name}`}
            type={i < pinPositions.length / 2 ? "target" : "source"}
            position={Position.Left}
            id={pin.name}
            className="pin-handle"
            style={{ left: pin.x, top: pin.y }}
            title={pin.name}
          />
        ))}

      {/* Pin-positioned handles for custom SVG components */}
      {useCustomPins &&
        customPins.map((pin, i) => (
          <Handle
            key={`pin-${pin.name}`}
            type={i === 0 ? "target" : "source"}
            position={Position.Left}
            id={pin.name}
            className="pin-handle"
            style={{ left: pin.x, top: pin.y }}
            title={pin.name}
          />
        ))}

      {/* Fallback: side-positioned handles when no pin data */}
      {!usePinPositioned && !useCustomPins && (
        <>
          {data?.inputs?.map((input: string, index: number) => (
            <Handle
              key={`input-${index}`}
              type="target"
              position={Position.Left}
              id={input}
              style={{
                top: `${((index + 1) / ((data.inputs.length || 0) + 1)) * 100}%`,
              }}
              title={input}
            />
          ))}
          {data?.outputs?.map((output: string, index: number) => (
            <Handle
              key={`output-${index}`}
              type="source"
              position={Position.Right}
              id={output}
              style={{
                top: `${((index + 1) / ((data.outputs.length || 0) + 1)) * 100}%`,
              }}
              title={output}
            />
          ))}
        </>
      )}
    </div>
  );
}
