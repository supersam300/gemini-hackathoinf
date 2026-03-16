import { useState, useRef, useEffect } from 'react';
import { Monitor, Code2 } from 'lucide-react';

type ActiveView = 'simulation' | 'code-editor';

interface MenuBarProps {
  projectName: string;
  darkMode?: boolean;
  activeView?: ActiveView;
  onViewChange?: (view: ActiveView) => void;
  onMenuAction?: (action: string) => void;
}

type MenuItem =
  | { label: string; shortcut?: string; checked?: boolean }
  | { type: 'separator' };

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuData: MenuGroup[] = [
  {
    label: 'File',
    items: [
      { label: 'New Project', shortcut: 'Ctrl+N' },
      { label: 'Open...', shortcut: 'Ctrl+O' },
      { type: 'separator' },
      { label: 'Save', shortcut: 'Ctrl+S' },
      { label: 'Save As...', shortcut: 'Ctrl+Shift+S' },
      { label: 'Save to Local Storage' },
      { label: 'Load from Local Storage' },
      { type: 'separator' },
      { label: 'Export Canvas JSON...' },
      { label: 'Import Canvas JSON...' },
      { type: 'separator' },
      { label: 'Export Project as ZIP...' },
      { label: 'Export Schematic (PDF)...' },
      { type: 'separator' },
      { label: 'Import Schematic...' },
      { type: 'separator' },
      { label: 'Print...', shortcut: 'Ctrl+P' },
      { type: 'separator' },
      { label: 'Close Project', shortcut: 'Ctrl+W' },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', shortcut: 'Ctrl+Z' },
      { label: 'Redo', shortcut: 'Ctrl+Y' },
      { type: 'separator' },
      { label: 'Cut', shortcut: 'Ctrl+X' },
      { label: 'Copy', shortcut: 'Ctrl+C' },
      { label: 'Paste', shortcut: 'Ctrl+V' },
      { label: 'Delete', shortcut: 'Del' },
      { type: 'separator' },
      { label: 'Select All', shortcut: 'Ctrl+A' },
      { type: 'separator' },
      { label: 'Find Component...', shortcut: 'Ctrl+F' },
    ],
  },
  {
    label: 'View',
    items: [
      { label: 'Zoom In', shortcut: 'Ctrl++' },
      { label: 'Zoom Out', shortcut: 'Ctrl+-' },
      { label: 'Fit to Window', shortcut: 'Ctrl+Shift+H' },
      { type: 'separator' },
      { label: 'Show Grid', shortcut: 'Ctrl+G', checked: true },
      { label: 'Snap to Grid' },
      { label: 'Show Rulers' },
      { type: 'separator' },
      { label: 'Component Panel' },
      { label: 'Serial Monitor', shortcut: 'Ctrl+Shift+M' },
    ],
  },
  {
    label: 'Place',
    items: [
      { label: 'Wire', shortcut: 'W' },
      { label: 'Net Label', shortcut: 'L' },
      { label: 'Power Port', shortcut: 'P' },
      { type: 'separator' },
      { label: 'Junction', shortcut: 'J' },
      { label: 'No-Connect Flag', shortcut: 'Q' },
      { type: 'separator' },
      { label: 'New Component...' },
    ],
  },
  {
    label: 'Simulate',
    items: [
      { label: 'Run Simulation', shortcut: 'F5' },
      { label: 'Stop Simulation', shortcut: 'F6' },
      { type: 'separator' },
      { label: 'Oscilloscope View' },
      { label: 'Serial Plotter' },
      { type: 'separator' },
      { label: 'Simulation Settings...' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Verify / Compile', shortcut: 'Ctrl+R' },
      { label: 'Upload to Board', shortcut: 'Ctrl+U' },
      { type: 'separator' },
      { label: 'Generate BOM...' },
      { label: 'Design Rule Check...' },
      { type: 'separator' },
      { label: 'Board Manager...' },
      { label: 'Library Manager...' },
      { type: 'separator' },
      { label: 'Preferences', shortcut: 'Ctrl+,' },
    ],
  },
  {
    label: 'Help',
    items: [
      { label: 'Documentation' },
      { label: 'Getting Started Tutorial' },
      { label: 'Example Projects' },
      { type: 'separator' },
      { label: 'Check for Updates...' },
      { type: 'separator' },
      { label: 'About Circuit Designer' },
    ],
  },
];

export function MenuBar({ projectName, darkMode = false, activeView = 'simulation', onViewChange, onMenuAction }: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dm = darkMode;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleItemClick = (label: string) => {
    setOpenMenu(null);
    onMenuAction?.(label);
  };

  return (
    <div
      ref={barRef}
      className={`flex items-center h-[28px] border-b px-1 shrink-0 z-50 ${
        dm
          ? 'bg-gradient-to-b from-[#2d2d30] to-[#252526] border-[#3c3c3c]'
          : 'bg-gradient-to-b from-[#f8f8f8] to-[#f0f0f0] border-[#c8c8c8]'
      }`}
      style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >
      {/* Menu items (left) */}
      {menuData.map((menu, idx) => (
        <div key={menu.label} className="relative">
          <button
            className={`px-3 h-[24px] text-[12px] rounded transition-all duration-100 ${
              openMenu === idx
                ? 'bg-[#1565c0] text-white shadow-sm'
                : dm
                  ? 'text-[#ccc] hover:bg-[#3c3c3c]'
                  : 'text-[#2a2a2a] hover:bg-[#e0e0e0]'
            }`}
            onClick={() => setOpenMenu(openMenu === idx ? null : idx)}
            onMouseEnter={() => openMenu !== null && setOpenMenu(idx)}
          >
            {menu.label}
          </button>
          {openMenu === idx && (
            <div className={`absolute top-full left-0 z-50 min-w-[220px] py-1 rounded shadow-xl ${
              dm
                ? 'bg-[#2d2d30] border border-[#3c3c3c]'
                : 'bg-white border border-[#c0c0c0]'
            }`}
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)' }}
            >
              {menu.items.map((item, iidx) =>
                'type' in item && item.type === 'separator' ? (
                  <hr key={iidx} className={`my-1 mx-2 ${dm ? 'border-[#3c3c3c]' : 'border-[#e8e8e8]'}`} />
                ) : (
                  <div
                    key={iidx}
                    className={`flex items-center justify-between px-4 py-[4px] text-[12px] cursor-pointer group mx-1 rounded transition-colors duration-75 ${
                      dm
                        ? 'text-[#ccc] hover:bg-[#1565c0] hover:text-white'
                        : 'text-[#2a2a2a] hover:bg-[#1565c0] hover:text-white'
                    }`}
                    onClick={() => handleItemClick('label' in item ? item.label : '')}
                  >
                    <span className="flex items-center gap-2">
                      {'checked' in item && item.checked && (
                        <span className="text-[10px]">&#10003;</span>
                      )}
                      {'label' in item ? item.label : ''}
                    </span>
                    {'shortcut' in item && item.shortcut && (
                      <span className={`ml-8 text-[11px] font-mono group-hover:text-[#ccc] ${
                        dm ? 'text-[#666]' : 'text-[#999]'
                      }`}>
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}

      {/* Centered Simulation / Code Editor tabs */}
      <div className="flex-1 flex items-center justify-center">
        <div className={`flex items-center rounded-md overflow-hidden ${
          dm ? 'bg-[#1e1e1e] border border-[#3c3c3c]' : 'bg-[#e0e0e0] border border-[#b0b0b0]'
        }`}>
          <button
            className={`flex items-center gap-1.5 px-3 h-[22px] text-[11px] font-medium transition-all duration-150 ${
              activeView === 'simulation'
                ? dm
                  ? 'bg-[#1565c0] text-white'
                  : 'bg-[#1565c0] text-white'
                : dm
                  ? 'text-[#888] hover:text-[#ccc] hover:bg-[#333]'
                  : 'text-[#666] hover:text-[#333] hover:bg-[#d0d0d0]'
            }`}
            onClick={() => onViewChange?.('simulation')}
          >
            <Monitor size={12} />
            Simulation
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 h-[22px] text-[11px] font-medium transition-all duration-150 ${
              activeView === 'code-editor'
                ? dm
                  ? 'bg-[#1565c0] text-white'
                  : 'bg-[#1565c0] text-white'
                : dm
                  ? 'text-[#888] hover:text-[#ccc] hover:bg-[#333]'
                  : 'text-[#666] hover:text-[#333] hover:bg-[#d0d0d0]'
            }`}
            onClick={() => onViewChange?.('code-editor')}
          >
            <Code2 size={12} />
            Code Editor
          </button>
        </div>
      </div>

      <div className="mr-2" />
    </div>
  );
}
