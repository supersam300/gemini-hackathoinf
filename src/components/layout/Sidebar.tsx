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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-grab
                 bg-white border border-gray-200 shrink-0
                 hover:border-gray-400 hover:shadow-sm
                 active:cursor-grabbing active:shadow-md
                 transition-all duration-100 select-none"
    >
      <span className="text-sm leading-none">{component.icon}</span>
      <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{component.name}</span>
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
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap mr-0.5">
        {CATEGORY_LABELS[category]}
      </span>
      {components.map((comp) => (
        <ComponentChip key={comp.id} component={comp} />
      ))}
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
    <div className="flex items-center gap-2 px-3 py-2 bg-cream-50 border-b border-surface-border shrink-0 select-none overflow-x-auto">
      {/* Label */}
      <span className="text-xs font-bold uppercase tracking-widest text-gray-500 shrink-0 mr-1">
        Components
      </span>

      {/* Search */}
      <input
        type="text"
        placeholder="Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-28 px-2 py-1 text-xs rounded bg-white border border-gray-300
                   text-gray-700 placeholder-gray-400 shrink-0
                   focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
      />

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 shrink-0" />

      {/* Component chips grouped by category */}
      {Object.entries(filteredGroups).length === 0 ? (
        <span className="text-xs text-gray-400">No results</span>
      ) : (
        Object.entries(filteredGroups).map(([cat, comps], i, arr) => (
          <div key={cat} className="flex items-center gap-1.5 shrink-0">
            <CategoryGroup category={cat as ComponentCategory} components={comps} />
            {i < arr.length - 1 && <div className="w-px h-6 bg-gray-200 shrink-0 ml-1" />}
          </div>
        ))
      )}
    </div>
  );
}
