/** Represents an electronic component available in the palette */
export interface ComponentDefinition {
  /** Unique identifier for the component type */
  id: string;
  /** Human-readable name */
  name: string;
  /** Category for grouping in sidebar */
  category: ComponentCategory;
  /** Description shown on hover */
  description: string;
  /** Icon identifier or emoji */
  icon: string;
  /** Wokwi web-component tag name (e.g. "wokwi-led") */
  wokwiTag?: string;
  /** Number of input pins */
  inputs: number;
  /** Number of output pins */
  outputs: number;
}

export type ComponentCategory =
  | "basic"
  | "passive"
  | "active"
  | "ic"
  | "input"
  | "output";

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  basic: "Basic",
  passive: "Passive",
  active: "Active",
  ic: "ICs",
  input: "Input",
  output: "Output",
};
