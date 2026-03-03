import { useState, useRef, useEffect, type DragEvent } from "react";
import { COMPONENTS } from "../../constants/components";
import {
  CATEGORY_LABELS,
  type ComponentCategory,
  type ComponentDefinition,
} from "../../types/components";

// ─── Helpers ────────────────────────────────────────────────

function groupByCategory(
  components: ComponentDefinition[]
): Record<ComponentCategory, ComponentDefinition[]> {
  const groups = {} as Record<ComponentCategory, ComponentDefinition[]>;
  for (const comp of components) {
    (groups[comp.category] ??= []).push(comp);
  }
  return groups;
}

const grouped = groupByCategory(COMPONENTS);

// ─── ComponentButton ────────────────────────────────────────

function ComponentButton({ component }: { component: ComponentDefinition }) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      "application/simulide-component",
      JSON.stringify({ id: component.id, name: component.name })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      title={component.description}
      className="flex flex-col items-center gap-1 p-2 cursor-grab
                 bg-white border border-gray-200 rounded hover:border-accent-green hover:bg-accent-green/5
                 active:cursor-grabbing transition-all duration-150 hover:shadow-sm"
    >
      <span className="text-lg leading-none">{component.icon}</span>
      <span className="text-[10px] font-semibold text-gray-700 text-center whitespace-nowrap">
        {component.name}
      </span>
    </div>
  );
}

// ─── CategoryDropdown ──────────────────────────────────────

function CategoryDropdown({
  category,
  components,
}: {
  category: ComponentCategory;
  components: ComponentDefinition[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-300
                   hover:border-accent-green hover:bg-accent-green/5 transition-all duration-150
                   text-xs font-semibold text-gray-700 whitespace-nowrap hover:shadow-md relative z-10"
      >
        <span className="text-sm">{CATEGORY_LABELS[category]}</span>
        <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown menu - positioned fixed to avoid clipping */}
      {isOpen && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-2xl p-3 grid grid-cols-5 gap-2 w-max z-50"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxWidth: "600px",
          }}
        >
          {components.map((comp) => (
            <ComponentButton key={comp.id} component={comp} />
          ))}
        </div>
      )}
    </>
  );
}

// ─── ComponentToolbar ──────────────────────────────────────

export default function ComponentToolbar() {
  const [search, setSearch] = useState("");
  const lowerSearch = search.toLowerCase();

  const filteredGroups = Object.entries(grouped).reduce(
    (acc, [cat, comps]) => {
      const filtered = comps.filter(
        (c) =>
          c.name.toLowerCase().includes(lowerSearch) ||
          c.description.toLowerCase().includes(lowerSearch)
      );
      if (filtered.length > 0) {
        acc[cat as ComponentCategory] = filtered;
      }
      return acc;
    },
    {} as Record<ComponentCategory, ComponentDefinition[]>
  );

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-cream-50 via-cream-100 to-cream-50 border-b border-gray-300 shadow-sm shrink-0 select-none overflow-x-auto relative z-0">
      {/* Label */}
      <span className="text-xs font-bold uppercase tracking-widest text-gray-600 shrink-0">
        🔧 Components
      </span>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300 shrink-0" />

      {/* Category dropdowns */}
      <div className="flex items-center gap-2">
        {Object.entries(filteredGroups).length === 0 ? (
          <span className="text-xs text-gray-500">No components found</span>
        ) : (
          Object.entries(filteredGroups).map(([cat]) => (
            <CategoryDropdown
              key={cat}
              category={cat as ComponentCategory}
              components={filteredGroups[cat as ComponentCategory]}
            />
          ))
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search components…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg bg-white border border-gray-300
                     text-gray-700 placeholder-gray-400 w-48
                     focus:outline-none focus:ring-2 focus:ring-accent-green/40 focus:border-accent-green
                     transition-all duration-150"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
