import { useState, type DragEvent } from "react";
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

// ─── ComponentItem ─────────────────────────────────────────

function ComponentItem({ component }: { component: ComponentDefinition }) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    console.log("palette dragstart", component.id);
    // Send component ID in correct format
    e.dataTransfer.setData("application/componentId", component.id);
    // also provide a plain-text payload which some browsers require to allow
    // drops between elements
    e.dataTransfer.setData("text/plain", component.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      title={component.description}
      className="flex items-center gap-2 px-2 py-1.5 mx-1 text-sm cursor-grab
                 text-gray-300 hover:text-white hover:bg-gray-700/50
                 rounded transition-colors duration-150 select-none"
    >
      <span className="text-base">{component.icon}</span>
      <span className="font-medium">{component.name}</span>
    </div>
  );
}

// ─── CategorySection ──────────────────────────────────────

function CategorySection({
  category,
  components,
  expanded,
  onToggle,
}: {
  category: ComponentCategory;
  components: ComponentDefinition[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="select-none">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2 py-1 text-xs font-semibold
                   text-gray-400 hover:text-gray-300 transition-colors
                   hover:bg-gray-700/30"
      >
        <span className="text-xs">{expanded ? "▼" : "▶"}</span>
        <span className="uppercase tracking-wider">{CATEGORY_LABELS[category]}</span>
        <span className="ml-auto text-[10px]">{components.length}</span>
      </button>

      {expanded && (
        <div className="pl-2 mt-0.5 border-l border-gray-700">
          {components.map((comp) => (
            <ComponentItem key={comp.id} component={comp} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ComponentExplorer (VS Code style sidebar) ────────────

export default function ComponentExplorer() {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["basic", "power"])
  );

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

  const toggleCategory = (cat: string) => {
    const newSet = new Set(expandedCategories);
    newSet.has(cat) ? newSet.delete(cat) : newSet.add(cat);
    setExpandedCategories(newSet);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800 w-64 text-gray-100">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          🔧 Components
        </h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search components…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1.5 text-xs bg-gray-800 border border-gray-700
                       text-gray-100 placeholder-gray-500 rounded
                       focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                       transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Component List */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(filteredGroups).length === 0 ? (
          <div className="px-4 py-8 text-xs text-gray-500 text-center">
            No components found
          </div>
        ) : (
          <div className="py-2 space-y-1">
            {Object.entries(filteredGroups).map(([cat]) => (
              <CategorySection
                key={cat}
                category={cat as ComponentCategory}
                components={filteredGroups[cat as ComponentCategory]}
                expanded={expandedCategories.has(cat)}
                onToggle={() => toggleCategory(cat)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800 shrink-0 text-xs text-gray-500">
        <p>Drag components to canvas</p>
      </div>
    </div>
  );
}
