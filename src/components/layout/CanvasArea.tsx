import { type DragEvent, useState } from "react";

interface DroppedComponent {
  id: string;
  name: string;
  x: number;
  y: number;
}

export default function CanvasArea() {
  const [components, setComponents] = useState<DroppedComponent[]>([]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/simulide-component");
    if (!raw) return;

    try {
      const data = JSON.parse(raw) as { id: string; name: string };
      const rect = e.currentTarget.getBoundingClientRect();
      setComponents((prev) => [
        ...prev,
        {
          ...data,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        },
      ]);
    } catch {
      // ignore malformed data
    }
  };

  return (
    <main
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative flex-1 bg-white border border-surface-border overflow-hidden"
    >
      {/* Placeholder text when empty */}
      {components.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <p className="text-gray-300 text-sm mb-1">Drag components here</p>
          <span className="text-gray-300 text-2xl">↓</span>
        </div>
      )}

      {/* Dropped components */}
      {components.map((comp, i) => (
        <div
          key={`${comp.id}-${i}`}
          style={{ left: comp.x - 40, top: comp.y - 20 }}
          className="absolute px-4 py-2.5 text-xs font-medium text-gray-700
                     bg-white border border-gray-300 rounded-lg shadow-sm
                     select-none cursor-move"
        >
          {comp.name}
        </div>
      ))}
    </main>
  );
}
