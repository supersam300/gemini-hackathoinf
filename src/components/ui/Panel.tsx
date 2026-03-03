import { type HTMLAttributes, type ReactNode } from "react";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional panel title shown in a slim header bar */
  title?: string;
  /** Actions rendered in the panel header (e.g. buttons) */
  headerActions?: ReactNode;
  /** Remove default padding */
  noPadding?: boolean;
  children?: ReactNode;
}

export default function Panel({
  title,
  headerActions,
  noPadding = false,
  children,
  className = "",
  ...rest
}: PanelProps) {
  return (
    <div
      className={`
        flex flex-col bg-white border border-surface-border rounded-lg
        overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200
        ${className}
      `}
      {...rest}
    >
      {/* Header */}
      {(title || headerActions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-gradient-to-r from-cream-50 to-cream-100 shrink-0">
          {title && (
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              {title}
            </span>
          )}
          {headerActions && (
            <div className="flex items-center gap-2">{headerActions}</div>
          )}
        </div>
      )}

      {/* Body */}
      <div className={`flex-1 overflow-auto ${noPadding ? "" : "p-4"}`}>
        {children}
      </div>
    </div>
  );
}
