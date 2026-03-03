import { type DragEvent, useState } from "react";
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

// ─── Sub-components ─────────────────────────────────────────

function ComponentChip({ component }: { component: ComponentDefinition }) {
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
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-grab
                 bg-white border border-gray-200 shrink-0
                 hover:border-accent-green hover:shadow-md hover:shadow-accent-green/20
                 active:cursor-grabbing active:shadow-lg active:border-accent-green/60
                 transition-all duration-150 select-none hover:scale-105 active:scale-100"
    >
      <span className="text-sm leading-none text-lg">{component.icon}</span>
      <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{component.name}</span>
    </div>
  );
}

function CategoryGroup({
  category,
  components,
}: {
  category: ComponentCategory;
  components: ComponentDefinition[];
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap bg-gray-100 px-2 py-1 rounded">
        {CATEGORY_LABELS[category]}
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        {components.map((comp) => (
          <ComponentChip key={comp.id} component={comp} />
        ))}
      </div>
    </div>
  );
}

// ─── ComponentPalette (horizontal bar) ──────────────────────

export default function Sidebar() {
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
    <div className="flex flex-col gap-3 px-4 py-3 bg-gradient-to-b from-cream-50 to-cream-100 border-b border-gray-200 shrink-0 select-none overflow-y-auto shadow-sm">
      {/* Header Row */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-600 shrink-0">
          🔧 Components
        </span>

        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-gray-300
                       text-gray-700 placeholder-gray-400 shrink-0
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

      {/* Component chips grouped by category */}
      <div className="flex flex-col gap-3">
        {Object.entries(filteredGroups).length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 bg-white/50 rounded-lg">
            <span>🔍</span>
            <span>No components found</span>
          </div>
        ) : (
          Object.entries(filteredGroups).map(([cat]) => (
            <CategoryGroup
              key={cat}
              category={cat as ComponentCategory}
              components={filteredGroups[cat as ComponentCategory]}
            />
          ))
        )}
      </div>
    </div>
  );
}
