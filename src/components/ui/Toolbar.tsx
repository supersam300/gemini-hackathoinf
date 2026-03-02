import { type HTMLAttributes, type ReactNode } from "react";

interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  /** Toolbar content sections — use `ToolbarGroup` for logical grouping */
  children: ReactNode;
}

export default function Toolbar({
  children,
  className = "",
  ...rest
}: ToolbarProps) {
  return (
    <div
      className={`
        flex items-center gap-1 px-2 py-1
        bg-cream-100 border-b border-surface-border
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Visually groups toolbar items with a separator */
export function ToolbarGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1 border-r border-surface-border pr-2 mr-1 last:border-r-0 last:pr-0 last:mr-0">
      {children}
    </div>
  );
}

/** Pushes subsequent toolbar items to the right */
export function ToolbarSpacer() {
  return <div className="flex-1" />;
}
