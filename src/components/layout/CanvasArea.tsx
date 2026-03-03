import Canvas from "../diagram/Canvas";

/**
 * Canvas Area Component
 *
 * Main workspace area containing the React Flow circuit diagram canvas.
 * Handles component placement and circuit editing.
 */
export default function CanvasArea() {
  return (
    <main className="flex-1 bg-vs-dark-500 border border-gray-800 overflow-hidden relative">
      <Canvas />
    </main>
  );
}
