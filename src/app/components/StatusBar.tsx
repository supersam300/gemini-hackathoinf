import { Layers, MapPin, ZoomIn } from 'lucide-react';

interface StatusBarProps {
  statusMessage: string;
  zoom: number;
  coordinates: { x: number; y: number };
  componentCount: number;
  darkMode?: boolean;
}

export function StatusBar({ statusMessage, zoom, coordinates, componentCount, darkMode = false }: StatusBarProps) {
  const dm = darkMode;
  return (
    <div
      className={`flex items-center h-[24px] text-white px-2 shrink-0 gap-0 text-[11px] select-none overflow-hidden shadow-inner ${
        dm
          ? 'bg-gradient-to-r from-[#1a1a2e] to-[#16213e]'
          : 'bg-gradient-to-r from-[#1a3a5c] to-[#1a4a6c]'
      }`}
      style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >
      {/* Status indicator dot + message */}
      <div className={`flex items-center gap-1.5 px-2.5 border-r ${dm ? 'border-[#2a3a5a]' : 'border-[#2a5a8a]'} min-w-0`}>
        <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
        <span className="text-[11px] text-[#c0d8f0] truncate">{statusMessage}</span>
      </div>

      {/* Component count */}
      <div className={`flex items-center gap-1 px-2.5 border-r ${dm ? 'border-[#2a3a5a]' : 'border-[#2a5a8a]'} shrink-0`}>
        <Layers size={11} className="text-[#80b0d8]" />
        <span className="text-[#d0e8f8]">{componentCount}</span>
        <span className="text-[#80b0d8]">components</span>
      </div>

      {/* Coordinates */}
      <div className={`flex items-center gap-1 px-2.5 border-r ${dm ? 'border-[#2a3a5a]' : 'border-[#2a5a8a]'} shrink-0`}>
        <MapPin size={11} className="text-[#80b0d8]" />
        <span className="text-[#d0e8f8] font-mono">
          {coordinates.x.toString().padStart(4, ' ')}, {coordinates.y.toString().padStart(4, ' ')} px
        </span>
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-1 px-2.5 shrink-0">
        <ZoomIn size={11} className="text-[#80b0d8]" />
        <span className="text-[#d0e8f8]">{zoom}%</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Grid info */}
      <div className={`flex items-center gap-1 px-2.5 border-l ${dm ? 'border-[#2a3a5a]' : 'border-[#2a5a8a]'} shrink-0 hidden md:flex`}>
        <span className="text-[#80b0d8]">Grid: 20px</span>
      </div>
    </div>
  );
}
