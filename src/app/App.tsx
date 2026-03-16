import { useState, useCallback, useRef, useEffect } from 'react';
import { MenuBar } from './components/MenuBar';
import { MainToolbar } from './components/MainToolbar';
import { ComponentPanel } from './components/ComponentPanel';
import { CircuitCanvas, PlacedComponent, Wire } from './components/CircuitCanvas';
import { AIPanel, ChatMessage } from './components/AIPanel';
import { StatusBar } from './components/StatusBar';
import { compileSketch } from '../api/arduino';
import { saveCircuit, loadCircuit } from '../api/circuits';
// Code Editor imports
import { Editor } from './components/arduino-ide/Editor';
import { BottomPanel } from './components/arduino-ide/BottomPanel';
import { Sidebar } from './components/arduino-ide/Sidebar';
import ArduinoToolbar from '../components/arduino/ArduinoToolbar';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import LoadDialog from '../components/layout/LoadDialog';
import {
  FileNode,
  OpenTab,
  blinkCode,
  compilerOutput,
} from './components/arduino-ide/arduinoData';
import { BOARDS, PORTS } from './components/arduino-ide/data';
// Existing stores & APIs
import { useEditorStore } from '../store/editorStore';
import { useArduinoStore } from '../store/arduinoStore';
import { useSimulationStore } from '../store/simulationStore';
import {
  Settings, Moon, Sun, Grid3X3, Sparkles, Cpu,
  Monitor, Code2,
} from 'lucide-react';

type ActiveView = 'simulation' | 'code-editor';
type BottomTab = 'problems' | 'output' | 'terminal' | 'serial';

const initialComponents: PlacedComponent[] = [
  { id: '1', type: 'arduino-uno', label: 'U1', x: 140, y: 150, rotation: 0, selected: false },
  { id: '2', type: 'resistor', label: 'R1', x: 380, y: 195, rotation: 0, selected: false },
  { id: '3', type: 'led', label: 'D1', x: 470, y: 175, rotation: 0, selected: false },
  { id: '4', type: 'resistor', label: 'R2', x: 380, y: 285, rotation: 0, selected: false },
  { id: '5', type: 'capacitor', label: 'C1', x: 340, y: 300, rotation: 0, selected: false },
];

const initialMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'ai',
    content:
      'Hello! I can help you wire these components or generate the C++ code for your blocks. What would you like to do?',
    timestamp: '10:32 AM',
  },
];

const CHAT_HISTORY_KEY = 'simuide-ai-chat-history';
const CHAT_SESSION_KEY = 'simuide-ai-session-id';
const CANVAS_PROJECT_STORAGE_KEY = 'simuide-canvas-project';

function shouldUseCanvasVisionBuildTool(prompt: string): boolean {
  const text = prompt.trim().toLowerCase();
  if (!text) return false;

  const buildIntent =
    /(build|compile|run|simulate|start)\b/.test(text) &&
    /(project|codebase|code|circuit)\b/.test(text);
  const canvasIntent =
    /(from canvas|using canvas|look at canvas|take (a )?(picture|snapshot)|image|refer)/.test(text);
  const shorthandBuildIntent =
    /(build this|make it run|run this|build and run)/.test(text);

  return buildIntent || canvasIntent || shorthandBuildIntent;
}

async function captureCanvasSnapshotBase64(darkMode: boolean): Promise<string | null> {
  const el = document.getElementById('circuit-canvas-container');
  if (!el) return null;
  const canvas = await html2canvas(el, {
    backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
    scale: 1,
  });
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}

function loadSavedMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return initialMessages;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return initialMessages;
    return parsed;
  } catch {
    return initialMessages;
  }
}

const defaultCodeTab: OpenTab = {
  id: 'blink-ino',
  name: 'Blink.ino',
  content: blinkCode,
  isDirty: false,
  extension: 'ino',
};

export default function App() {
  // ── Active View Tab ─────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<ActiveView>('simulation');

  // ── Simulation state ────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<string>('select');
  const [zoom, setZoom] = useState<number>(100);
  const [statusMessage, setStatusMessage] = useState<string>('Ready — Circuit Designer');
  const [components, setComponents] = useState<PlacedComponent[]>(initialComponents);
  const [wiresState, setWiresState] = useState<Wire[]>([]);
  const [selectedLibComponent, setSelectedLibComponent] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadSavedMessages());
  const [aiSessionId, setAiSessionId] = useState<string>(() => localStorage.getItem(CHAT_SESSION_KEY) || '');
  const [coordinates, setCoordinates] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(true);
  const aiResponseIdx = useRef(0);
  const [showGrid, setShowGrid] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  
  // Dynamic file tree for the IDE sidebar
  const [ideFileTree, setIdeFileTree] = useState<FileNode[]>([{
    id: "workspace",
    name: "WORKSPACE",
    type: "folder",
    children: [
      {
        id: "default-project",
        name: "MyProject",
        type: "folder",
        children: [
          { id: "blink-ino", name: "Blink.ino", type: "file", extension: "ino", content: blinkCode },
        ],
      }
    ]
  }]);

  // ── Clipboard for multi-component copy/paste ────────────────────────────
  const [clipboard, setClipboard] = useState<{ components: PlacedComponent[]; wires: Wire[] } | null>(null);

  // ── Load Workspace dialog ───────────────────────────────────────────────
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);

  // ── Code Editor state ───────────────────────────────────────────────────
  const [codeTabs, setCodeTabs] = useState<OpenTab[]>([defaultCodeTab]);
  const [codeActiveTabId, setCodeActiveTabId] = useState<string | null>('blink-ino');
  const activeCode = codeTabs.find((t) => t.id === codeActiveTabId)?.content || '';
  const [bottomVisible, setBottomVisible] = useState(true);
  const [bottomTab, setBottomTab] = useState<BottomTab>('output');



  const editorStore = useEditorStore();
  const arduinoStore = useArduinoStore();
  const simulationStore = useSimulationStore();

  // Sync editor code from tabs back to the editor store
  useEffect(() => {
    const activeTab = codeTabs.find((t) => t.id === codeActiveTabId);
    if (activeTab) {
      editorStore.setCode(activeTab.content);
    }
  }, [codeActiveTabId, codeTabs]);

  // Persist AI chat history and session locally so conversations survive reload.
  useEffect(() => {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (aiSessionId) localStorage.setItem(CHAT_SESSION_KEY, aiSessionId);
  }, [aiSessionId]);

  // ── Code Editor handlers ────────────────────────────────────────────────
  const handleOpenFile = useCallback(
    (node: FileNode) => {
      if (node.type !== 'file') return;
      const existing = codeTabs.find((t) => t.id === node.id);
      if (existing) { setCodeActiveTabId(node.id); return; }
      const newTab: OpenTab = {
        id: node.id,
        name: node.name,
        content: node.content || `// ${node.name}\n`,
        isDirty: false,
        extension: node.extension || '',
      };
      setCodeTabs((prev) => [...prev, newTab]);
      setCodeActiveTabId(node.id);
    },
    [codeTabs]
  );

  const handleCloseTab = useCallback(
    (id: string) => {
      setCodeTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        const next = prev.filter((t) => t.id !== id);
        if (id === codeActiveTabId && next.length > 0) {
          setCodeActiveTabId(next[Math.min(idx, next.length - 1)].id);
        } else if (next.length === 0) {
          setCodeActiveTabId(null);
        }
        return next;
      });
    },
    [codeActiveTabId]
  );

  const handleContentChange = useCallback((id: string, content: string) => {
    setCodeTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, content, isDirty: true } : t))
    );
  }, []);

  // Helper to get all files from the ideFileTree
  const getAllFiles = useCallback(() => {
    const files: { name: string; content: string }[] = [];
    const traverse = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'file') {
          // Check if it's currently open and dirty in codeTabs
          const tab = codeTabs.find(t => t.id === node.id);
          files.push({
            name: node.name,
            content: tab ? tab.content : (node.content || '')
          });
        } else if (node.type === 'folder' && node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(ideFileTree);
    return files;
  }, [ideFileTree, codeTabs]);

  // ── Verify using real Arduino backend when available ─────────
  const handleVerify = useCallback(() => {
    if (arduinoStore.compileStatus === 'running' || arduinoStore.uploadStatus === 'running') return;
    arduinoStore.clearLog();
    setBottomVisible(true);
    setBottomTab('output');

    const files = getAllFiles();
    arduinoStore.compile(files);
  }, [getAllFiles, arduinoStore]);

  // ── Upload using real Arduino backend when available ────────────────────
  const handleUpload = useCallback(() => {
    if (arduinoStore.compileStatus === 'running' || arduinoStore.uploadStatus === 'running') return;
    arduinoStore.clearLog();
    setBottomVisible(true);
    setBottomTab('output');

    const files = getAllFiles();
    arduinoStore.upload(files);
  }, [getAllFiles, arduinoStore]);

  // ── Simulation with connection validation ───────────────────────────────
  const [simError, setSimError] = useState<string | null>(null);

  // Auto-clear error messages after 5 seconds
  useEffect(() => {
    if (!simError) return;
    const t = setTimeout(() => setSimError(null), 5000);
    return () => clearTimeout(t);
  }, [simError]);

  const handleSimulate = useCallback(async () => {
    // If already running, stop simulation
    if (simulationStore.isRunning) {
      simulationStore.stopSimulation();
      setStatusMessage('Simulation stopped');
      setSimError(null);
      return;
    }

    setSimError(null);

    // --- Validation 1: Check if canvas has any components ---
    if (components.length === 0) {
      const msg = '⚠ Not connected — No components on canvas';
      setStatusMessage(msg);
      setSimError(msg);
      return;
    }

    // --- Validation 2: Check for a power source (board OR battery/vcc) ---
    const boardTypes = ['arduino-uno', 'arduino-nano', 'arduino-mega', 'esp32'];
    const powerSourceTypes = ['battery', 'vcc'];
    const boardComp = components.find(c => boardTypes.includes(c.type));
    const powerComp = components.find(c => powerSourceTypes.includes(c.type));
    const hasPowerSource = !!boardComp || !!powerComp;

    if (!hasPowerSource) {
      const msg = '⚠ Not connected — No power source found. Add an Arduino board, Battery, or VCC';
      setStatusMessage(msg);
      setSimError(msg);
      return;
    }

    // --- Validation 3: Check that at least one wire exists ---
    if (wiresState.length === 0) {
      const msg = '⚠ Connection error — No wires found. Connect components before simulating';
      setStatusMessage(msg);
      setSimError(msg);
      return;
    }

    // --- Validation 4: Check that wires reference valid components ---
    const compIds = new Set(components.map(c => c.id));
    const brokenWires = wiresState.filter(w => !compIds.has(w.fromComponentId) || !compIds.has(w.toComponentId));
    if (brokenWires.length > 0) {
      const msg = `⚠ Connection error — ${brokenWires.length} wire(s) reference missing components`;
      setStatusMessage(msg);
      setSimError(msg);
      return;
    }

    // --- Validation 5: Check that at least one power source is connected ---
    const allSources = [...components.filter(c => boardTypes.includes(c.type)), ...components.filter(c => powerSourceTypes.includes(c.type))];
    const connectedSource = allSources.find(src =>
      wiresState.some(w => w.fromComponentId === src.id || w.toComponentId === src.id)
    );
    if (!connectedSource) {
      const msg = `⚠ Connection error — No power source is connected to any component`;
      setStatusMessage(msg);
      setSimError(msg);
      return;
    }
    const primarySource = connectedSource;
    const sourceWires = wiresState.filter(
      w => w.fromComponentId === primarySource.id || w.toComponentId === primarySource.id
    );

    // --- Validation 6: Warn about unconnected non-passive components ---
    const connectedIds = new Set<string>();
    wiresState.forEach(w => { connectedIds.add(w.fromComponentId); connectedIds.add(w.toComponentId); });
    const passiveTypes = ['breadboard', 'breadboard-half', 'vcc', 'gnd', 'battery'];
    const unconnected = components.filter(
      c => !connectedIds.has(c.id) && !boardTypes.includes(c.type) && !passiveTypes.includes(c.type)
    );
    if (unconnected.length > 0) {
      const names = unconnected.slice(0, 3).map(c => c.label).join(', ');
      const more = unconnected.length > 3 ? ` and ${unconnected.length - 3} more` : '';
      setStatusMessage(`⚠ Warning: ${names}${more} not connected — simulation may be incomplete`);
    }

    // --- All validations passed ---
    setBottomVisible(true);
    setBottomTab('output');
    arduinoStore.clearLog();
    arduinoStore.addLog('● Validating circuit connections...', 'info');
    arduinoStore.addLog(`✓ ${primarySource.label} connected with ${sourceWires.length} wire(s)`, 'success');
    if (unconnected.length > 0) {
      arduinoStore.addLog(`⚠ ${unconnected.length} component(s) not connected`, 'warning');
    }

    // --- If no MCU board, run visual-only simulation (no code needed) ---
    if (!boardComp) {
      arduinoStore.addLog('● No MCU detected — running direct circuit simulation', 'info');
      arduinoStore.addLog('▶ Visual simulation started (power source mode)', 'success');
      setStatusMessage('● Simulation running (visual-only — power source mode)');
      // Mark simulation as running so the bridge in CircuitCanvas drives power
      simulationStore.startSimulation('');
      return;
    }

    // --- MCU present — compile and start ---
    setStatusMessage('Compiling sketch for simulation...');

    // Get all files from the workspace (for multi-file project support)
    const files = getAllFiles();
    
    // Check if there is at least one .ino file (arduino-cli requirement)
    if (!files.some(f => f.name.endsWith('.ino'))) {
      const msg = '⚠ Not connected — No .ino file found in project. Please create one first.';
      setStatusMessage(msg);
      setSimError(msg);
      arduinoStore.addLog(msg, 'error');
      return;
    }

    arduinoStore.addLog('● Compiling sketch...', 'info');

    try {
      const success = await arduinoStore.compile(files);
      if (success) {
        const hex = arduinoStore.lastCompiledHex;
        if (hex) {
          simulationStore.startSimulation(hex);
          arduinoStore.addLog('✓ Compilation successful', 'success');
          arduinoStore.addLog('▶ Simulation started (AVR @ 16MHz)', 'success');
          setStatusMessage('● Simulation running (AVR @ 16MHz)');
        } else {
          // Compilation server may not return hex — start visual-only
          simulationStore.startSimulation('');
          arduinoStore.addLog('⚠ Compile server did not return .hex — using mock simulation', 'warning');
          arduinoStore.addLog('▶ Simulation started in visual-only mode', 'success');
          setStatusMessage('● Simulation running (visual-only mode)');
        }
      } else {
        const msg = '✗ Compilation failed — check your code for errors';
        arduinoStore.addLog(msg, 'error');
        setStatusMessage(msg);
        setSimError(msg);
      }
    } catch (err) {
      // Compile server not reachable — start a visual-only simulation
      simulationStore.startSimulation('');
      arduinoStore.addLog('⚠ Compile server not reachable — running visual-only simulation', 'warning');
      arduinoStore.addLog('To enable full AVR simulation, start: node server/index.js', 'info');
      arduinoStore.addLog('▶ Simulation started in visual-only mode', 'success');
      setStatusMessage('● Simulation running (visual-only — compile server offline)');
    }
  }, [components, wiresState, simulationStore, codeTabs, codeActiveTabId, arduinoStore]);

  // Close settings dropdown on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [settingsOpen]);

  // Undo / Redo history (tracks both components and wires)
  interface HistorySnapshot { components: PlacedComponent[]; wires: Wire[]; }
  const [history, setHistory] = useState<HistorySnapshot[]>([{ components: initialComponents, wires: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushHistory = useCallback((newComponents: PlacedComponent[], newWires: Wire[]) => {
    setHistory(prev => {
      const nextHistory = [...prev.slice(0, historyIndex + 1), { components: newComponents, wires: newWires }];
      return nextHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setComponents(history[newIndex].components);
      setWiresState(history[newIndex].wires);
      setStatusMessage('Undo');
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setComponents(history[newIndex].components);
      setWiresState(history[newIndex].wires);
      setStatusMessage('Redo');
    }
  }, [historyIndex, history]);

  const handleSelectLibComponent = useCallback((type: string) => {
    setSelectedLibComponent(type);
    setActiveTool('place');
    setStatusMessage(`Click on canvas to place component · Esc to cancel`);
  }, []);

  const handlePlaceComponent = useCallback(
    (type: string, label: string, x: number, y: number) => {
      const id = `${Date.now()}`;
      const newComp: PlacedComponent = { id, type, label, x, y, rotation: 0, selected: false };
      setComponents(prev => {
        const next = [...prev, newComp];
        pushHistory(next, wiresState);
        return next;
      });
      setStatusMessage(`Placed ${label} at (${x}, ${y})`);
      setSelectedLibComponent(null);
      setActiveTool('select');
    },
    [pushHistory, wiresState]
  );

  const handleUpdateComponents = useCallback((updated: PlacedComponent[]) => {
    setComponents(updated);
    pushHistory(updated, wiresState);
  }, [pushHistory, wiresState]);

  const handleDeleteComponent = useCallback((id: string) => {
    setComponents(prev => {
      const comp = prev.find(c => c.id === id);
      if (comp) setStatusMessage(`Deleted ${comp.label} (${comp.type})`);
      const next = prev.filter(c => c.id !== id);
      pushHistory(next, wiresState);
      return next;
    });
  }, [pushHistory, wiresState]);

  const handleUpdateWires = useCallback((updatedWires: Wire[]) => {
    setWiresState(updatedWires);
    pushHistory(components, updatedWires);
  }, [pushHistory, components]);

  const executeAIActions = useCallback((content: string | any) => {
    try {
      let data;
      if (typeof content === 'string') {
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
        if (!jsonMatch) return;
        data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        data = content;
      }
      
      if (!data.actions || !Array.isArray(data.actions)) return;
      let nextComponents = [...components];
      let nextWires = [...wiresState];
      let componentsChanged = false;
      let wiresChanged = false;
      let shouldStartSimulation = false;
      let shouldStopSimulation = false;
      let shouldVerifyBuild = false;

      const normalizeActionType = (value: unknown) => {
        const t = String(value || '').trim().toUpperCase();
        if (t === 'BUILD_PROJECT' || t === 'TEST_PROJECT' || t === 'COMPILE') return 'VERIFY_BUILD';
        if (t === 'SIMULATE' || t === 'RUN_SIMULATION') return 'START_SIMULATION';
        return t;
      };

      const normalizeComponentType = (value: unknown) => {
        const raw = String(value || '').trim().toLowerCase();
        const aliases: Record<string, string> = {
          'arduino': 'arduino-uno',
          'arduino uno': 'arduino-uno',
          'uno': 'arduino-uno',
          'ground': 'gnd',
        };
        return aliases[raw] || raw;
      };

      const parseActionMaybeString = (value: unknown): any | null => {
        if (value && typeof value === 'object') return value;
        const raw = String(value || '').trim();
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          // Best-effort conversion for python-style dict strings.
          try {
            const repaired = raw
              .replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":')
              .replace(/:\s*'([^']*?)'(\s*[},])/g, ': "$1"$2');
            return JSON.parse(repaired);
          } catch {
            return null;
          }
        }
      };

      const inferComponentTypeFromBlob = (blob: string): string => {
        const text = blob.toLowerCase();
        if (text.includes('arduino') || text.includes('uno')) return 'arduino-uno';
        if (text.includes('resistor')) return 'resistor';
        if (text.includes('led')) return 'led';
        if (text.includes('"type":"gnd"') || text.includes("'type':'gnd'") || text.includes('ground')) return 'gnd';
        if (text.includes('"type":"vcc"') || text.includes("'type':'vcc'")) return 'vcc';
        if (text.includes('battery')) return 'battery';
        return '';
      };

      const normalizedActions = data.actions
        .map((rawAction: any) => parseActionMaybeString(rawAction))
        .filter((a: any) => a && typeof a === 'object');

      const norm = (v: unknown) => String(v || '').trim().toLowerCase();
      const resolveComponentId = (ref: unknown): string | null => {
        const token = String(ref || '').trim();
        if (!token) return null;
        // exact ID
        const exact = nextComponents.find(c => c.id === token);
        if (exact) return exact.id;
        // id, label, or type case-insensitive
        const n = token.toLowerCase();
        const ci = nextComponents.find(c =>
          c.id.toLowerCase() === n ||
          c.label.toLowerCase() === n ||
          c.type.toLowerCase() === n
        );
        return ci?.id || null;
      };
      const normalizePin = (pin: string) => {
        const raw = String(pin || '').trim();
        if (!raw) return '';
        const p = raw.toUpperCase().replace(/\s+/g, '');
        const aliases: Record<string, string> = {
          ANODE: 'A',
          CATHODE: 'C',
          GROUND: 'GND',
          VPLUS: 'VCC',
          VIN: 'VCC',
          PIN13: '13',
          D13: '13',
        };
        return aliases[p] || raw;
      };
      const defaultPinFor = (compType: string, side: 'from' | 'to') => {
        const t = norm(compType);
        if (t.includes('arduino')) return side === 'from' ? '13' : 'GND';
        if (t === 'led') return side === 'from' ? 'A' : 'C';
        if (t === 'resistor' || t === 'capacitor') return side === 'from' ? '1' : '2';
        if (t === 'battery') return side === 'from' ? 'POS' : 'NEG';
        if (t === 'vcc') return 'VCC';
        if (t === 'gnd') return 'GND';
        return side === 'from' ? 'out-0' : 'in-0';
      };
      const parseEndpoint = (value: unknown, side: 'from' | 'to') => {
        const s = String(value || '').trim();
        if (!s) return null;
        // support "id:pin" and "id.pin"
        let compRef = s;
        let pinRef = '';
        if (s.includes(':')) {
          const idx = s.indexOf(':');
          compRef = s.slice(0, idx).trim();
          pinRef = s.slice(idx + 1).trim();
        } else if (s.includes('.')) {
          const idx = s.lastIndexOf('.');
          compRef = s.slice(0, idx).trim();
          pinRef = s.slice(idx + 1).trim();
        }
        const compId = resolveComponentId(compRef);
        if (!compId) return null;
        const comp = nextComponents.find(c => c.id === compId);
        const pinName = normalizePin(pinRef) || defaultPinFor(comp?.type || '', side);
        return { compId, pinName };
      };

      const parseEndpointFromAction = (action: any, side: 'from' | 'to') => {
        const endpointRaw = action?.[side];
        if (typeof endpointRaw === 'object' && endpointRaw !== null) {
          const compRef = endpointRaw.componentId || endpointRaw.component || endpointRaw.id || endpointRaw.label;
          const pin = endpointRaw.pin || endpointRaw.pinName || endpointRaw.handle;
          if (!compRef) return null;
          return parseEndpoint(`${compRef}:${pin || ''}`, side);
        }
        if (!endpointRaw) {
          const compRef = action?.[`${side}ComponentId`] || action?.[`${side}Id`] || action?.[`${side}Label`];
          const pin = action?.[`${side}Pin`] || action?.[`${side}PinName`] || action?.[`${side}Handle`];
          if (!compRef) return null;
          return parseEndpoint(`${compRef}:${pin || ''}`, side);
        }
        return parseEndpoint(endpointRaw, side);
      };

      const normalizeIncomingCode = (rawCode: unknown): string => {
        let value = typeof rawCode === 'string' ? rawCode : String(rawCode ?? '');
        if (!value) return '';

        // Handle model responses that wrap code as a quoted JSON string.
        // Example: "\"int x = 1;\\nvoid setup(){}\""
        const trimmed = value.trim();
        const looksQuoted =
          (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith("'") && trimmed.endsWith("'"));
        if (looksQuoted) {
          try {
            value = JSON.parse(trimmed);
          } catch {
            value = trimmed.slice(1, -1);
          }
        }

        // If code is double-escaped and still contains literal \n/\t, decode once.
        if (!value.includes('\n') && (value.includes('\\n') || value.includes('\\t') || value.includes('\\"'))) {
          try {
            value = JSON.parse(`"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
          } catch {
            value = value
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
          }
        }

        return value.replace(/\r\n/g, '\n');
      };

      const updateFileTreeContent = (fileName: string, fileContent: string) => {
        const normalizedInput = fileName.trim().toLowerCase();
        const normalizedTarget = normalizedInput === 'sketch.ino' ? 'blink.ino' : normalizedInput;
        const extension = (fileName.split('.').pop() || '').toLowerCase();
        let matchedNodeId: string | null = null;

        setIdeFileTree((prev) => {
          const patchNodes = (nodes: FileNode[]): FileNode[] => {
            return nodes.map((node) => {
              if (node.type === 'file') {
                const nodeName = node.name.toLowerCase();
                const sameName = nodeName === normalizedTarget || (normalizedTarget === 'blink.ino' && nodeName === 'sketch.ino');
                if (sameName) {
                  matchedNodeId = node.id;
                  return { ...node, content: fileContent };
                }
                return node;
              }
              if (node.type === 'folder' && node.children) {
                return { ...node, children: patchNodes(node.children) };
              }
              return node;
            });
          };

          const patched = patchNodes(prev);
          if (matchedNodeId) return patched;

          const insertIntoProjectFolder = (nodes: FileNode[]): FileNode[] => {
            return nodes.map((node) => {
              if (
                node.type === 'folder' &&
                (node.id === 'default-project' || node.name.toLowerCase() === 'myproject')
              ) {
                const newId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                matchedNodeId = newId;
                const newFile: FileNode = {
                  id: newId,
                  name: fileName,
                  type: 'file',
                  extension,
                  content: fileContent,
                };
                return { ...node, children: [...(node.children || []), newFile] };
              }
              if (node.type === 'folder' && node.children) {
                return { ...node, children: insertIntoProjectFolder(node.children) };
              }
              return node;
            });
          };

          return insertIntoProjectFolder(patched);
        });

        return matchedNodeId;
      };

      normalizedActions.forEach((action: any) => {
        const actionType = normalizeActionType(
          action?.type || action?.action || action?.ACTION || action?.operation || action?.OPERATION
        );
        switch (actionType) {
          case 'PLACE_COMPONENT': {
            // Use action.id or action.label as the deterministc ID so wires can connect to it.
            // Fall back to a random ID if neither is provided.
            let componentType = normalizeComponentType(
              action.componentType || action.COMPONENTTYPE || action.component || action.name || action.NAME || action.typeName || action.TYPE
            );
            if (!componentType || /[\{\}\[\]]/.test(componentType) || componentType.length > 40) {
              componentType = inferComponentTypeFromBlob(JSON.stringify(action));
            }
            if (!componentType) break;

            const compLabel = action.label || action.LABEL || action.componentId || action.COMPONENTID || action.id || action.ID || componentType.toUpperCase();
            const compId = action.id || action.ID || action.componentId || action.COMPONENTID || action.label || action.LABEL || `${componentType}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
            const newComp: PlacedComponent = {
              id: compId,
              type: componentType,
              x: action.x ?? action.X ?? 100,
              y: action.y ?? action.Y ?? 100,
              label: compLabel,
              selected: false,
              rotation: 0,
              attrs: action.properties || action.PROPERTIES || {},
            };
            if (!nextComponents.some(c => c.id === newComp.id)) {
              nextComponents.push(newComp);
              componentsChanged = true;
            }
            setStatusMessage(`AI placed ${action.componentType}`);
            break;
          }
          case 'ADD_WIRE': {
            const from = parseEndpointFromAction(action, 'from');
            const to = parseEndpointFromAction(action, 'to');
            if (from && to && from.compId !== to.compId) {
              const dupe = nextWires.some(w =>
                w.fromComponentId === from.compId &&
                w.fromPinName === from.pinName &&
                w.toComponentId === to.compId &&
                w.toPinName === to.pinName
              );
              if (!dupe) {
                const newWire: Wire = {
                  id: action.wireId || `w-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                  fromComponentId: from.compId,
                  fromPinName: from.pinName,
                  toComponentId: to.compId,
                  toPinName: to.pinName,
                  color: 'red',
                };
                nextWires.push(newWire);
                wiresChanged = true;
              }
              setStatusMessage('AI added a wire');
            }
            break;
          }
          case 'DELETE_COMPONENT': {
            if (action.componentId) {
              const resolvedId = resolveComponentId(action.componentId);
              if (resolvedId) {
                nextComponents = nextComponents.filter(c => c.id !== resolvedId);
                nextWires = nextWires.filter(w => w.fromComponentId !== resolvedId && w.toComponentId !== resolvedId);
                componentsChanged = true;
                wiresChanged = true;
                setStatusMessage(`AI deleted component ${resolvedId}`);
              }
            }
            break;
          }
          case 'DELETE_WIRE': {
            if (action.wireId) {
              const before = nextWires.length;
              nextWires = nextWires.filter(w => w.id !== action.wireId);
              if (nextWires.length !== before) wiresChanged = true;
              setStatusMessage('AI deleted a wire');
            }
            break;
          }
          case 'START_SIMULATION':
            shouldStartSimulation = true;
            break;
          case 'STOP_SIMULATION':
            shouldStopSimulation = true;
            break;
          case 'UPDATE_CODE': {
            if (action.code) {
              const normalizedCode = normalizeIncomingCode(action.code);
              const requestedName = String(action.fileName || 'Blink.ino');
              const normalizedName = requestedName.trim().toLowerCase();
              const fileName = normalizedName === 'sketch.ino' ? 'Blink.ino' : requestedName;
              let activeTabIdToOpen: string | null = null;
              setCodeTabs(prev => {
                const existing = prev.find(t => t.name.toLowerCase() === fileName.toLowerCase());
                if (existing) {
                  activeTabIdToOpen = existing.id;
                  return prev.map(t => t.name.toLowerCase() === fileName.toLowerCase() ? { ...t, content: normalizedCode, isDirty: true } : t);
                } else {
                  const newId = `${Date.now()}-${fileName}`;
                  activeTabIdToOpen = newId;
                  return [...prev, {
                    id: newId,
                    name: fileName,
                    content: normalizedCode,
                    isDirty: true,
                    extension: fileName.split('.').pop() || '',
                  }];
                }
              });
              const treeNodeId = updateFileTreeContent(fileName, normalizedCode);
              if (activeTabIdToOpen) setCodeActiveTabId(activeTabIdToOpen);
              else if (treeNodeId) setCodeActiveTabId(treeNodeId);
              setStatusMessage(`AI updated code: ${fileName}`);
              setBottomVisible(true);
              setBottomTab('output'); 
            }
            break;
          }
          case 'VERIFY_BUILD':
            shouldVerifyBuild = true;
            break;
          default:
            console.warn('Unknown AI action:', actionType);
        }
      });
      if (componentsChanged) setComponents(nextComponents);
      if (wiresChanged) setWiresState(nextWires);
      if (componentsChanged || wiresChanged) {
        pushHistory(nextComponents, nextWires);
      }
      if (shouldStopSimulation) simulationStore.stopSimulation();
      if (shouldVerifyBuild) setTimeout(() => handleVerify(), 0);
      if (shouldStartSimulation) setTimeout(() => handleSimulate(), 0);
    } catch (e) {
      console.error('Failed to execute AI actions:', e);
    }
  }, [components, wiresState, handleSimulate, handleVerify, simulationStore, pushHistory, setIdeFileTree]);

  // ── AI Chat — send message to Gemini agent (Multimodal) ──────────────────
  const handleSendMessage = useCallback(async (content: string, model?: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: now,
    };
    setMessages(prev => [...prev, userMsg]);
    const useCanvasVisionBuildTool = shouldUseCanvasVisionBuildTool(content);
    setStatusMessage(
      useCanvasVisionBuildTool
        ? 'Canvas Vision Build tool: capturing canvas & planning build...'
        : 'Agent is capturing canvas & thinking...'
    );

    try {
      const base64Data = await captureCanvasSnapshotBase64(darkMode);
      const effectivePrompt = useCanvasVisionBuildTool
        ? `${content}

[Canvas Vision Build Tool]
- Analyze the attached canvas screenshot and canvasState JSON.
- Produce executable actions to make the project runnable.
- Include UPDATE_CODE, VERIFY_BUILD, and START_SIMULATION when appropriate.
`
        : content;

      const response = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: effectivePrompt,
          canvasState: { components, wires: wiresState },
          image: base64Data,
          model,
          sessionId: aiSessionId || undefined,
          mode: useCanvasVisionBuildTool ? 'canvas_json' : undefined,
        })
      });

      const raw = await response.text();
      let result: any = null;
      try {
        result = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error(`AI endpoint returned invalid JSON (HTTP ${response.status})`);
      }
      if (!response.ok) {
        throw new Error(result?.error || `AI endpoint failed (HTTP ${response.status})`);
      }
      
      if (result?.sessionId) {
        setAiSessionId(result.sessionId);
      }

      if (result?.success) {
        const aiMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: 'ai',
          content: result.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isCode: result.text && result.text.includes('```')
        };
        setMessages(prev => [...prev, aiMsg]);

        if (result.actions && result.actions.length > 0) {
          executeAIActions({ actions: result.actions });
        }
        setStatusMessage(
          useCanvasVisionBuildTool
            ? `Canvas Vision Build tool applied ${result.actions?.length || 0} action(s)`
            : 'AI response received'
        );
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'ai',
        content: `Error connecting to AI agent: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setStatusMessage('AI Chat failed');
    }
  }, [components, wiresState, darkMode, executeAIActions, aiSessionId]);

  // Dedicated interaction mode: sends raw canvas JSON intent directly to builder agent.
  const handleCanvasJsonInteraction = useCallback(async (content: string, model?: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, {
      id: `u-${Date.now()}`,
      role: 'user',
      content: `🧩 [Canvas JSON Mode]\n${content}`,
      timestamp: now,
    }]);
    setStatusMessage('Canvas Vision Build tool is capturing snapshot and planning changes...');
    try {
      const base64Data = await captureCanvasSnapshotBase64(darkMode);
      const response = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${content}

[Canvas Vision Build Tool]
- Use both canvasState and attached image.
- Return executable actions only.
- Build runnable project code when user asks to run/build.
`,
          canvasState: { components, wires: wiresState },
          image: base64Data,
          model,
          sessionId: aiSessionId || undefined,
          mode: 'canvas_json',
        }),
      });
      const raw = await response.text();
      let result: any = null;
      try {
        result = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error(`Canvas JSON endpoint returned invalid JSON (HTTP ${response.status})`);
      }
      if (!response.ok) throw new Error(result?.error || `Canvas JSON endpoint failed (HTTP ${response.status})`);
      if (result?.sessionId) setAiSessionId(result.sessionId);
      if (result?.success) {
        setMessages(prev => [...prev, {
          id: `a-${Date.now()}`,
          role: 'ai',
          content: result.text || 'Canvas JSON update prepared.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
        if (result.actions?.length) {
          executeAIActions({ actions: result.actions });
          setStatusMessage(`Canvas JSON agent applied ${result.actions.length} action(s)`);
        } else {
          setStatusMessage('Canvas JSON agent returned no executable actions');
        }
      } else {
        throw new Error(result?.error || 'Canvas JSON agent failed');
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'ai',
        content: `Canvas JSON agent error: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setStatusMessage('Canvas JSON agent failed');
    }
  }, [components, wiresState, aiSessionId, executeAIActions, darkMode]);

  // ── AI Visual QA (Multimodal Gemini Vision) ─────────────────────────────
  const handleVisualQA = useCallback(async (prompt: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: `📷 [Screenshot Attached]\n${prompt}`,
      timestamp: now,
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const el = document.getElementById('circuit-canvas-container');
      if (!el) throw new Error('Could not find circuit canvas');
      
      setStatusMessage('Taking snapshot for Gemini Vision...');
      
      // html2canvas requires the element to be in the DOM and visible.
      // foreignObjects (if any) can be tricky, but this captures the rendered HTML.
      const canvas = await html2canvas(el, {
         backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
         scale: 1, // keep it relatively small for the API
      });
      
      const base64Full = canvas.toDataURL('image/jpeg', 0.8);
      // Remove prefix "data:image/jpeg;base64,"
      const base64Data = base64Full.split(',')[1];
      
      setStatusMessage('Analyzing circuit with Gemini 1.5 Flash...');
      
      const response = await fetch('/api/ai/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: base64Data, prompt })
      });
      
      const raw = await response.text();
      let result: any = null;
      try {
        result = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error(`Vision endpoint returned invalid JSON (HTTP ${response.status})`);
      }
      if (!response.ok) {
        throw new Error(result?.error || `Vision endpoint failed (HTTP ${response.status})`);
      }
      
      if (result?.success) {
        setMessages(prev => [...prev, {
          id: `a-${Date.now()}`,
          role: 'ai',
          content: result.analysis,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isCode: result.analysis.includes('```') // Very basic code detection
        }]);
        executeAIActions(result.analysis);
        setStatusMessage('AI Analysis complete');
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'ai',
        content: `Error analyzing circuit: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setStatusMessage('AI Analysis failed');
    }
  }, [darkMode]);

  const handleClearChat = useCallback(() => {
    setMessages(initialMessages);
    const newId = `session-${Date.now()}`;
    setAiSessionId(newId);
    setStatusMessage('Started a new AI conversation');
  }, []);



  // ── Copy / Paste ────────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    const selected = components.filter(c => c.selected);
    if (selected.length === 0) { setStatusMessage('Nothing selected to copy'); return; }
    const selectedIds = new Set(selected.map(c => c.id));
    const connectedWires = wiresState.filter(
      w => selectedIds.has(w.fromComponentId) && selectedIds.has(w.toComponentId)
    );
    setClipboard({ components: selected, wires: connectedWires });
    setStatusMessage(`Copied ${selected.length} component(s)`);
  }, [components, wiresState]);

  const handlePaste = useCallback(() => {
    if (!clipboard || clipboard.components.length === 0) { setStatusMessage('Nothing to paste'); return; }
    const offset = 40;
    const idMap = new Map<string, string>();
    const newComponents = clipboard.components.map(c => {
      const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      idMap.set(c.id, newId);
      return { ...c, id: newId, x: c.x + offset, y: c.y + offset, selected: true };
    });
    const newWires = clipboard.wires.map(w => ({
      ...w,
      id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fromComponentId: idMap.get(w.fromComponentId) || w.fromComponentId,
      toComponentId: idMap.get(w.toComponentId) || w.toComponentId,
    }));
    const updatedExisting = components.map(c => ({ ...c, selected: false }));
    const allComponents = [...updatedExisting, ...newComponents];
    const allWires = [...wiresState, ...newWires];
    setComponents(allComponents);
    setWiresState(allWires);
    pushHistory(allComponents, allWires);
    setStatusMessage(`Pasted ${newComponents.length} component(s)`);
  }, [clipboard, components, wiresState, pushHistory]);

  const applyImportedCanvasProject = useCallback((data: any) => {
    if (!data || !Array.isArray(data.components) || !Array.isArray(data.wires)) {
      throw new Error('Invalid canvas JSON format');
    }
    setComponents(data.components);
    setWiresState(data.wires);
    setHistory([{ components: data.components, wires: data.wires }]);
    setHistoryIndex(0);
  }, []);

  // ── Cloud Save / Load — directly using canvas state ───────────────────
  const handleCloudSave = useCallback(async () => {
    const name = window.prompt('Project name:', 'My Circuit');
    if (!name) return;
    try {
      // Map PlacedComponent[] → API components format
      const apiComponents = components.map(c => ({
        nodeId: c.id,
        type: 'componentNode',
        componentType: c.type,
        label: c.label,
        position: { x: c.x, y: c.y },
        properties: { rotation: c.rotation, ...(c.attrs || {}) } as Record<string, unknown>,
        handles: { inputs: [], outputs: [] },
      }));
      // Map Wire[] → API connections format
      const apiConnections = wiresState.map(w => ({
        edgeId: w.id,
        from: { nodeId: w.fromComponentId, componentType: '', handle: w.fromPinName },
        to: { nodeId: w.toComponentId, componentType: '', handle: w.toPinName },
        type: w.color,
      }));
      await saveCircuit({
        projectName: name,
        code: activeCode,
        language: 'cpp',
        components: apiComponents,
        connections: apiConnections,
      });
      setStatusMessage('Project saved to cloud ✓');
    } catch (err: any) {
      setStatusMessage(`Save failed: ${err.message}`);
    }
  }, [components, wiresState, activeCode]);

  const handleCloudLoad = useCallback(async (id: string) => {
    try {
      const res = await loadCircuit(id);
      const { circuit } = res;
      // Map API components → PlacedComponent[]
      const loadedComponents: PlacedComponent[] = circuit.components.map(c => ({
        id: c.nodeId,
        type: c.componentType,
        label: c.label,
        x: c.position.x,
        y: c.position.y,
        rotation: (c.properties?.rotation as number) ?? 0,
        selected: false,
        attrs: Object.fromEntries(
          Object.entries(c.properties || {}).filter(([k]) => k !== 'rotation').map(([k, v]) => [k, String(v)])
        ),
      }));
      // Map API connections → Wire[]
      const loadedWires: Wire[] = circuit.connections.map(conn => ({
        id: conn.edgeId,
        fromComponentId: conn.from.nodeId,
        fromPinName: conn.from.handle,
        toComponentId: conn.to.nodeId,
        toPinName: conn.to.handle,
        color: conn.type || 'green',
      }));
      setComponents(loadedComponents);
      setWiresState(loadedWires);
      setHistory([{ components: loadedComponents, wires: loadedWires }]);
      setHistoryIndex(0);
      setStatusMessage(`Loaded "${circuit.projectName}" ✓`);
    } catch (err: any) {
      setStatusMessage(`Load failed: ${err.message}`);
    }
  }, []);

  // ── Menu bar action handlers ────────────────────────────────────────────
  const handleMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'New Project':
        setComponents([]);
        setWiresState([]);
        setHistory([{ components: [], wires: [] }]);
        setHistoryIndex(0);
        setStatusMessage('New project created');
        break;
      case 'Open...': {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const data = JSON.parse(reader.result as string);
              applyImportedCanvasProject(data);
              setStatusMessage(`Opened ${file.name}`);
            } catch {
              setStatusMessage('Failed to open file — invalid format');
            }
          };
          reader.readAsText(file);
        };
        input.click();
        break;
      }
      case 'Import Canvas JSON...': {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const data = JSON.parse(reader.result as string);
              applyImportedCanvasProject(data);
              setStatusMessage(`Imported canvas JSON: ${file.name}`);
            } catch {
              setStatusMessage('Import failed — invalid canvas JSON format');
            }
          };
          reader.readAsText(file);
        };
        input.click();
        break;
      }
      case 'Save': {
        const data = JSON.stringify({ components, wires: wiresState }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'circuit-project.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        setStatusMessage('Project saved');
        break;
      }
      case 'Export Canvas JSON...': {
        const data = JSON.stringify({ components, wires: wiresState }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'canvas.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        setStatusMessage('Canvas exported as JSON');
        break;
      }
      case 'Save As...': {
        const data = JSON.stringify({ components, wires: wiresState }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'circuit-project.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        setStatusMessage('Project saved as...');
        break;
      }
      case 'Save to Local Storage': {
        localStorage.setItem(
          CANVAS_PROJECT_STORAGE_KEY,
          JSON.stringify({
            components,
            wires: wiresState,
            savedAt: new Date().toISOString(),
          })
        );
        setStatusMessage('Project saved to local storage');
        break;
      }
      case 'Load from Local Storage': {
        try {
          const raw = localStorage.getItem(CANVAS_PROJECT_STORAGE_KEY);
          if (!raw) {
            setStatusMessage('No locally saved project found');
            break;
          }
          const parsed = JSON.parse(raw);
          applyImportedCanvasProject(parsed);
          setStatusMessage('Project loaded from local storage');
        } catch {
          setStatusMessage('Failed to load project from local storage');
        }
        break;
      }
      case 'Export Project as ZIP...': {
        const zip = new JSZip();
        
        // 1. Add circuit JSON
        const circuitData = JSON.stringify({ components, wires: wiresState }, null, 2);
        zip.file("circuit-project.json", circuitData);
        
        // 2. Add all code files from ideFileTree recursively
        const addFilesToZip = (folder: JSZip, nodes: FileNode[]) => {
          nodes.forEach(node => {
            if (node.type === "file") {
               // Find latest content from codeTabs if it's currently open
               const activeTab = codeTabs.find(t => t.id === node.id);
               const content = activeTab ? activeTab.content : (node.content || "");
               folder.file(node.name, content);
            } else if (node.type === "folder" && node.children) {
               const subFolder = folder.folder(node.name);
               if (subFolder) addFilesToZip(subFolder, node.children);
            }
          });
        };
        addFilesToZip(zip, ideFileTree);
        
        // 3. Generate and download
        zip.generateAsync({ type: "blob" }).then(function(content) {
          const url = URL.createObjectURL(content);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'simuide-project.zip';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 100);
          setStatusMessage('Project exported as ZIP');
        });
        break;
      }
      case 'Export Schematic (PDF)...': {
        const svgEl = document.querySelector('svg');
        if (svgEl) {
          const serializer = new XMLSerializer();
          const svgStr = serializer.serializeToString(svgEl);
          const blob = new Blob([svgStr], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'schematic.svg';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 100);
          setStatusMessage('Exported schematic as SVG');
        }
        break;
      }
      case 'Undo': handleUndo(); break;
      case 'Redo': handleRedo(); break;
      case 'Cut': {
        const selected = components.filter(c => c.selected);
        if (selected.length === 0) { setStatusMessage('Nothing selected to cut'); break; }
        const selectedIds = new Set(selected.map(c => c.id));
        const connectedWires = wiresState.filter(w => selectedIds.has(w.fromComponentId) && selectedIds.has(w.toComponentId));
        setClipboard({ components: selected, wires: connectedWires });
        const nextComps = components.filter(c => !selectedIds.has(c.id));
        const nextWires = wiresState.filter(w => !selectedIds.has(w.fromComponentId) && !selectedIds.has(w.toComponentId));
        setComponents(nextComps);
        setWiresState(nextWires);
        pushHistory(nextComps, nextWires);
        setStatusMessage(`Cut ${selected.length} component(s)`);
        break;
      }
      case 'Copy': handleCopy(); break;
      case 'Paste': handlePaste(); break;
      case 'Delete': {
        const sel = components.filter(c => c.selected);
        if (sel.length === 0) break;
        const selIds = new Set(sel.map(c => c.id));
        const nextComps = components.filter(c => !selIds.has(c.id));
        const nextWires = wiresState.filter(w => !selIds.has(w.fromComponentId) && !selIds.has(w.toComponentId));
        setComponents(nextComps);
        setWiresState(nextWires);
        pushHistory(nextComps, nextWires);
        setStatusMessage(`Deleted ${sel.length} component(s)`);
        break;
      }
      case 'Select All':
        setComponents(prev => prev.map(c => ({ ...c, selected: true })));
        setStatusMessage('Selected all components');
        break;
      case 'Zoom In': setZoom(z => Math.min(z + 10, 300)); break;
      case 'Zoom Out': setZoom(z => Math.max(z - 10, 25)); break;
      case 'Fit to Window':
        window.dispatchEvent(new CustomEvent('simuide-reset-view'));
        break;
      case 'Show Grid':
        setShowGrid(g => !g);
        break;
      case 'Serial Monitor':
        if (activeView !== 'code-editor') setActiveView('code-editor');
        setBottomVisible(true);
        setBottomTab('serial');
        break;
      case 'Wire':
        setActiveTool('wire');
        setStatusMessage('Wire tool — click to start drawing a wire');
        break;
      case 'Run Simulation':
        handleSimulate();
        break;
      case 'Stop Simulation':
        simulationStore.stopSimulation();
        setStatusMessage('Simulation stopped');
        break;
      case 'Verify / Compile':
        handleVerify();
        break;
      case 'Upload to Board':
        handleUpload();
        break;
      case 'Generate BOM...': {
        if (components.length === 0) { setStatusMessage('No components to generate BOM'); break; }
        const bom = components.map(c => `${c.label}: ${c.type}`).join('\n');
        const blob = new Blob([bom], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bill-of-materials.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        setStatusMessage('BOM exported');
        break;
      }
      case 'Design Rule Check...': {
        const connectedIds = new Set<string>();
        wiresState.forEach(w => { connectedIds.add(w.fromComponentId); connectedIds.add(w.toComponentId); });
        const issues = components.filter(c =>
          !connectedIds.has(c.id) && !['arduino-uno', 'arduino-nano', 'arduino-mega', 'esp32'].includes(c.type)
        );
        if (issues.length === 0) {
          setStatusMessage('DRC passed — no issues found');
        } else {
          setStatusMessage(`DRC: ${issues.length} issue(s) — ${issues.slice(0, 3).map(c => `${c.label} unconnected`).join('; ')}`);
        }
        break;
      }
      case 'Dark Mode':
      case 'Light Mode':
        setDarkMode(d => !d);
        break;
      case 'Preferences':
        setSettingsOpen(true);
        break;
      case 'Clear Canvas':
        setComponents([]);
        setWiresState([]);
        pushHistory([], []);
        setStatusMessage('Canvas cleared');
        break;
      default:
        setStatusMessage(`${action}`);
    }
  }, [handleUndo, handleRedo, handleCopy, handlePaste, components, wiresState, pushHistory, handleVerify, handleUpload, activeView, simulationStore, handleSimulate, applyImportedCanvasProject]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo(); return; }
    if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo(); return; }
    if (e.ctrlKey && e.key === 'c') {
      if (activeView === 'simulation' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault(); handleCopy();
      }
      return;
    }
    if (e.ctrlKey && e.key === 'v') {
      if (activeView === 'simulation' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault(); handlePaste();
      }
      return;
    }
    if (e.ctrlKey && e.key === 'a') {
      if (activeView === 'simulation' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setComponents(prev => prev.map(c => ({ ...c, selected: true })));
      }
      return;
    }
    if (e.key === 'Escape') {
      setSelectedLibComponent(null);
      setActiveTool('select');
      setStatusMessage('Ready');
    }
    if ((e.key === 'w' || e.key === 'W') && activeView === 'simulation' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      setActiveTool('wire');
      setStatusMessage('Wire tool — click to start drawing a wire');
    }
    if (e.key === 'Delete' && activeView === 'simulation') {
      const sel = components.filter(c => c.selected);
      if (sel.length > 0) {
        const selIds = new Set(sel.map(c => c.id));
        const nextComps = components.filter(c => !selIds.has(c.id));
        const nextWires = wiresState.filter(w => !selIds.has(w.fromComponentId) && !selIds.has(w.toComponentId));
        setComponents(nextComps);
        setWiresState(nextWires);
        pushHistory(nextComps, nextWires);
        setStatusMessage(`Deleted ${sel.length} component(s)`);
      }
    }
    if (e.key === 'F5') {
      e.preventDefault();
      handleSimulate();
    }
  }, [handleUndo, handleRedo, handleCopy, handlePaste, activeView, components, wiresState, pushHistory, handleSimulate]);

  const dm = darkMode;
  const titleBg = dm ? 'bg-[#1a1a1c] border-b border-white/5' : 'bg-[#212123] shadow-md';

  return (
    <div
      className={`flex flex-col h-screen overflow-hidden ${dm ? 'dark bg-[#1e1e1e]' : 'bg-[#e8e8e8]'}`}
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Title / App bar */}
      <div className={`flex items-center h-[36px] ${titleBg} px-4 shrink-0 select-none`}>
          <div className="flex items-center justify-center">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="butt">
               <path d="M18 6h-7a3 3 0 0 0-3 3v1M6 18h7a3 3 0 0 0 3-3v-1M9 12h6" />
             </svg>
          </div>
          <span className="text-[13px] font-bold text-white tracking-tight">SimuIDE</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setSettingsOpen(s => !s)}
              className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 transition-colors"
              title="Settings"
            >
              <Settings size={14} className="text-[#9aa8c0]" />
            </button>
            {settingsOpen && (
              <div className={`absolute right-0 top-full mt-1 w-[200px] rounded-lg shadow-xl z-[100] ${dm ? 'bg-[#2d2d30] border border-[#3c3c3c]' : 'bg-white border border-[#c0c0c0]'
                }`}>
                <div className="py-1">
                  <button
                    onClick={() => setShowGrid(g => !g)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-[12px] transition-colors ${dm ? 'text-[#ccc] hover:bg-[#3c3c3c]' : 'text-[#333] hover:bg-[#e8ecf0]'
                      }`}
                  >
                    <Grid3X3 size={14} className={showGrid ? 'text-[#0078d7]' : (dm ? 'text-[#666]' : 'text-[#888]')} />
                    <span>{showGrid ? 'Hide Grid' : 'Show Grid'}</span>
                  </button>
                  <button
                    onClick={() => setDarkMode(d => !d)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-[12px] transition-colors ${dm ? 'text-[#ccc] hover:bg-[#3c3c3c]' : 'text-[#333] hover:bg-[#e8ecf0]'
                      }`}
                  >
                    {dm ? <Sun size={14} className="text-[#f59e0b]" /> : <Moon size={14} className="text-[#555]" />}
                    <span>{dm ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu Bar with centered Simulation / Code Editor tabs */}
      <MenuBar
        projectName="sketch_mar06a"
        darkMode={darkMode}
        activeView={activeView}
        onViewChange={setActiveView}
        onMenuAction={handleMenuAction}
      />

      {/* Shared toolbar */}
      <MainToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        zoom={zoom}
        onZoomChange={setZoom}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onResetView={() => window.dispatchEvent(new CustomEvent('simuide-reset-view'))}
        onSimulate={handleSimulate}
        isSimulating={simulationStore.isRunning}
        onVerify={handleVerify}
        onUpload={handleUpload}
        onNewProject={() => handleMenuAction('New Project')}
        onOpenProject={() => setLoadDialogOpen(true)}
        onSaveProject={() => handleMenuAction('Save')}
        darkMode={darkMode}
        activeView={activeView}
        boardName={(() => {
          const boardTypes: Record<string, string> = {
            'arduino-uno': 'Arduino Uno', 'arduino-nano': 'Arduino Nano',
            'arduino-mega': 'Arduino Mega', esp32: 'ESP32',
          };
          const b = components.find(c => boardTypes[c.type]);
          return b ? boardTypes[b.type] : '';
        })()}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: only visible in code-editor mode */}
        {activeView === 'code-editor' && (
          <Sidebar 
            panel="explorer" 
            openTabs={codeTabs} 
            activeTabId={codeActiveTabId} 
            onOpenFile={handleOpenFile} 
            fileTree={ideFileTree}
            setFileTree={setIdeFileTree}
            darkMode={darkMode} 
          />
        )}
        {/* Component panel: only visible in simulation mode */}
        {activeView === 'simulation' && (
          <ComponentPanel
            selectedComponent={selectedLibComponent}
            onSelectComponent={handleSelectLibComponent}
            darkMode={darkMode}
          />
        )}

        {/* Center area: switches between canvas and code editor */}
        {activeView === 'simulation' ? (
          <div className="flex-1 relative overflow-hidden w-full h-full flex" style={{ minHeight: 0 }}>
            <CircuitCanvas
              components={components}
              activeTool={activeTool}
              zoom={zoom}
              selectedLibComponent={selectedLibComponent}
              onPlaceComponent={handlePlaceComponent}
              onUpdateComponents={handleUpdateComponents}
              onDeleteComponent={handleDeleteComponent}
              onStatusChange={setStatusMessage}
              onCoordinatesChange={setCoordinates}
              onZoomChange={setZoom}
              wires={wiresState}
              onUpdateWires={handleUpdateWires}
              showGrid={showGrid}
              darkMode={darkMode}
              onClearCanvas={() => handleMenuAction('Clear Canvas')}
            />
            {/* Simulation error toast */}
            {simError && (
              <div
                className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg border animate-in fade-in slide-in-from-top-2"
                style={{
                  background: dm ? 'linear-gradient(135deg, #3c1518, #2d1215)' : '#fef2f2',
                  borderColor: dm ? '#7f1d1d' : '#fca5a5',
                  color: dm ? '#fca5a5' : '#991b1b',
                  maxWidth: '90%',
                }}
              >
                <span style={{ fontSize: 16 }}>⚠</span>
                <span className="text-[12px] font-medium">{simError.replace(/^⚠\s*/, '')}</span>
                <button
                  onClick={() => setSimError(null)}
                  className="ml-2 opacity-60 hover:opacity-100 transition-opacity text-[14px]"
                  title="Dismiss"
                >×</button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <ArduinoToolbar code={activeCode} />
            <div className="flex-1 overflow-hidden">
              <Editor
                tabs={codeTabs}
                activeTabId={codeActiveTabId}
                onTabSelect={setCodeActiveTabId}
                onTabClose={handleCloseTab}
                onContentChange={handleContentChange}
                darkMode={darkMode}
              />
            </div>
            <BottomPanel
              isVisible={bottomVisible}
              onClose={() => setBottomVisible(false)}
              compileLogs={arduinoStore.outputLog}
              isCompiling={arduinoStore.compileStatus === 'running' || arduinoStore.uploadStatus === 'running'}
              activeTab={bottomTab}
              onTabChange={setBottomTab}
              serialOutput={simulationStore.serialOutput}
              darkMode={darkMode}
            />
          </div>
        )}

        <AIPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          onVisualQA={handleVisualQA}
          onBuild={handleVerify}
          onCanvasJsonInteract={handleCanvasJsonInteraction}
          onClearChat={handleClearChat}
          collapsed={aiPanelCollapsed}
          onToggleCollapse={() => setAiPanelCollapsed(c => !c)}
          darkMode={darkMode}
        />
      </div>

      <LoadDialog
        open={loadDialogOpen}
        onClose={() => setLoadDialogOpen(false)}
        onLoad={(id) => {
          handleCloudLoad(id);
          setStatusMessage('Workspace loaded ✓');
        }}
      />

      <StatusBar
        statusMessage={statusMessage}
        zoom={zoom}
        coordinates={coordinates}
        componentCount={components.length}
        darkMode={darkMode}
      />
    </div>
  );
}
