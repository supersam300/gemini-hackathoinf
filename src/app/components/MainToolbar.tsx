import {
  FolderOpen, Save, CheckCircle, Upload, Bug, MousePointer2,
  Pencil, Hand, ZoomIn, ZoomOut, Undo2, Redo2, Trash2,
  Play, FilePlus, Maximize2
} from 'lucide-react';

type ActiveView = 'simulation' | 'code-editor';

interface MainToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onResetView: () => void;
  darkMode?: boolean;
  boardName?: string;
  activeView?: ActiveView;
}

function ToolButton({
  tool,
  activeTool,
  onClick,
  title,
  children,
  disabled = false,
  darkMode = false,
}: {
  tool?: string;
  activeTool?: string;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  darkMode?: boolean;
}) {
  const isActive = tool && activeTool === tool;
  const dm = darkMode;
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-2.5 h-[30px] rounded text-[12px] transition-all duration-100
        ${disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}
        ${isActive
          ? dm
            ? 'bg-[#1565c0]/20 border border-[#1565c0] text-[#6cb4ee] shadow-sm'
            : 'bg-[#e3f0fc] border border-[#1565c0] text-[#1565c0] shadow-sm'
          : disabled
            ? dm ? 'text-[#666]' : 'text-[#888]'
            : dm
              ? 'text-[#ccc] hover:bg-[#3c3c3c] border border-transparent'
              : 'text-[#2a2a2a] hover:bg-[#e8ecf0] border border-transparent'
        }
      `}
    >
      {children}
    </button>
  );
}

function Separator({ darkMode = false }: { darkMode?: boolean }) {
  return <div className={`w-[1px] h-[18px] mx-1.5 shrink-0 ${darkMode ? 'bg-[#555]' : 'bg-[#d0d0d0]'}`} />;
}

export function MainToolbar({ activeTool, onToolChange, zoom, onZoomChange, onUndo, onRedo, onResetView, darkMode, boardName, activeView = 'simulation' }: MainToolbarProps) {
  const dm = !!darkMode;
  const zoomIn = () => onZoomChange(Math.min(zoom + 10, 300));
  const zoomOut = () => onZoomChange(Math.max(zoom - 10, 25));

  return (
    <div
      className={`flex items-center h-[42px] border-b px-2.5 gap-0.5 shrink-0 overflow-x-auto shadow-sm ${dm
          ? 'bg-gradient-to-b from-[#2d2d30] to-[#252526] border-[#3c3c3c]'
          : 'bg-gradient-to-b from-[#f4f4f6] to-[#eaeaec] border-[#c8c8c8]'
        }`}
      style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >
      {/* File Group — always visible */}
      <ToolButton title="New Project (Ctrl+N)" onClick={() => { }} darkMode={dm}>
        <FilePlus size={15} />
        <span className="hidden sm:inline">New</span>
      </ToolButton>
      <ToolButton title="Open Project (Ctrl+O)" onClick={() => { }} darkMode={dm}>
        <FolderOpen size={15} />
        <span className="hidden sm:inline">Open</span>
      </ToolButton>
      <ToolButton title="Save (Ctrl+S)" onClick={() => { }} darkMode={dm}>
        <Save size={15} />
        <span className="hidden sm:inline">Save</span>
      </ToolButton>

      <Separator darkMode={dm} />

      {/* IDE-only Build Group */}
      {activeView === 'code-editor' && (
        <>
          <ToolButton
            title="Verify / Compile (Ctrl+R)"
            onClick={() => { }}
            tool=""
            activeTool=""
            darkMode={dm}
          >
            <CheckCircle size={15} className="text-[#009FAD]" />
            <span className="text-[12px] font-medium" style={{ color: dm ? '#00b8c4' : '#007a80' }}>Verify</span>
          </ToolButton>

          <ToolButton title="Upload to Board (Ctrl+U)" onClick={() => { }} darkMode={dm}>
            <Upload size={15} style={{ color: dm ? '#6cb4ee' : '#1565c0' }} />
            <span className="text-[12px] font-medium" style={{ color: dm ? '#6cb4ee' : '#1565c0' }}>Upload</span>
          </ToolButton>

          <ToolButton title="Debug Mode" onClick={() => { }} darkMode={dm}>
            <Bug size={15} style={{ color: dm ? '#e0a060' : '#b85c00' }} />
            <span className="text-[12px] font-medium" style={{ color: dm ? '#e0a060' : '#b85c00' }}>Debug</span>
          </ToolButton>

          <Separator darkMode={dm} />
        </>
      )}

      {/* Canvas-only Simulate button */}
      {activeView === 'simulation' && (
        <>
          <ToolButton title="Run Simulation (F5)" onClick={() => { }} darkMode={dm}>
            <Play size={14} style={{ color: dm ? '#73C991' : '#2e7d32' }} />
            <span className="text-[12px] font-medium" style={{ color: dm ? '#73C991' : '#2e7d32' }}>Simulate</span>
          </ToolButton>

          <Separator darkMode={dm} />
        </>
      )}

      {/* Canvas-only Drawing Tools */}
      {activeView === 'simulation' && (
        <>
          <ToolButton
            tool="select"
            activeTool={activeTool}
            title="Select / Move (Esc)"
            onClick={() => onToolChange('select')}
            darkMode={dm}
          >
            <MousePointer2 size={14} />
            <span className="hidden md:inline">Select</span>
          </ToolButton>

          <ToolButton
            tool="wire"
            activeTool={activeTool}
            title="Draw Wire (W)"
            onClick={() => onToolChange('wire')}
            darkMode={dm}
          >
            <Pencil size={14} />
            <span className="hidden md:inline">Wire</span>
          </ToolButton>

          <ToolButton
            tool="pan"
            activeTool={activeTool}
            title="Pan Canvas (Space)"
            onClick={() => onToolChange('pan')}
            darkMode={dm}
          >
            <Hand size={14} />
            <span className="hidden md:inline">Pan</span>
          </ToolButton>

          <ToolButton
            tool="delete"
            activeTool={activeTool}
            title="Delete Component (Del)"
            onClick={() => onToolChange('delete')}
            darkMode={dm}
          >
            <Trash2 size={14} />
            <span className="hidden md:inline">Delete</span>
          </ToolButton>

          <ToolButton title="Reset View" onClick={onResetView} darkMode={dm}>
            <Maximize2 size={14} />
            <span className="hidden md:inline">Reset</span>
          </ToolButton>

          <Separator darkMode={dm} />

          {/* Zoom Controls */}
          <ToolButton title="Zoom Out (Ctrl+-)" onClick={zoomOut} darkMode={dm}>
            <ZoomOut size={14} />
          </ToolButton>

          <div className={`flex items-center h-[26px] border rounded-[2px] px-2 min-w-[54px] justify-center text-[12px] select-none ${dm
              ? 'border-[#555] bg-[#3c3c3c] text-[#ccc]'
              : 'border-[#b0b0b0] bg-white text-[#2a2a2a]'
            }`}>
            {zoom}%
          </div>

          <ToolButton title="Zoom In (Ctrl++)" onClick={zoomIn} darkMode={dm}>
            <ZoomIn size={14} />
          </ToolButton>

          <Separator darkMode={dm} />

          {/* History */}
          <ToolButton title="Undo (Ctrl+Z)" onClick={onUndo} darkMode={dm}>
            <Undo2 size={14} />
          </ToolButton>
          <ToolButton title="Redo (Ctrl+Y)" onClick={onRedo} darkMode={dm}>
            <Redo2 size={14} />
          </ToolButton>
        </>
      )}

      {/* Board display — pushed to right */}
      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        <span className={`text-[11px] hidden lg:inline ${dm ? 'text-[#888]' : 'text-[#666]'}`}>Board:</span>
        <div className={`flex items-center h-[26px] border rounded-[2px] px-2 text-[12px] select-none ${dm
            ? 'border-[#555] bg-[#3c3c3c] text-[#ccc]'
            : 'border-[#b0b0b0] bg-white text-[#2a2a2a]'
          }`}>
          <span className={boardName ? '' : `${dm ? 'text-[#666]' : 'text-[#999]'} italic`}>
            {boardName || 'No Board'}
          </span>
        </div>
      </div>
    </div>
  );
}