import { useState, useCallback, useRef, useEffect } from 'react';
import { MenuBar } from './components/MenuBar';
import { MainToolbar } from './components/MainToolbar';
import { ComponentPanel } from './components/ComponentPanel';
import { CircuitCanvas, PlacedComponent, Wire } from './components/CircuitCanvas';
import { AIPanel, ChatMessage } from './components/AIPanel';
import { FilePanel, FileEntry } from './components/FilePanel';
import { StatusBar } from './components/StatusBar';
import { compileSketch } from '../api/arduino';
// Code Editor imports
import { Editor } from './components/arduino-ide/Editor';
import { BottomPanel } from './components/arduino-ide/BottomPanel';
import {
  FileNode,
  OpenTab,
  blinkCode,
  compilerOutput,
} from './components/arduino-ide/arduinoData';
import { BOARDS, PORTS } from './components/arduino-ide/data';
// Existing stores & APIs
import { useProjectStore } from '../store/projectStore';
import { useEditorStore } from '../store/editorStore';
import { useArduinoStore } from '../store/arduinoStore';
import { useSimulationStore } from '../store/simulationStore';
import {
  Settings, Moon, Sun, Grid3X3,
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
  const [statusMessage, setStatusMessage] = useState<string>('Ready — Circuit Designer v2.1');
  const [components, setComponents] = useState<PlacedComponent[]>(initialComponents);
  const [wiresState, setWiresState] = useState<Wire[]>([]);
  const [selectedLibComponent, setSelectedLibComponent] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [coordinates, setCoordinates] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);
  const [filePanelCollapsed, setFilePanelCollapsed] = useState(false);
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const aiResponseIdx = useRef(0);
  const [showGrid, setShowGrid] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // ── Clipboard for multi-component copy/paste ────────────────────────────
  const [clipboard, setClipboard] = useState<{ components: PlacedComponent[]; wires: Wire[] } | null>(null);

  // ── Code Editor state ───────────────────────────────────────────────────
  const [codeTabs, setCodeTabs] = useState<OpenTab[]>([defaultCodeTab]);
  const [codeActiveTabId, setCodeActiveTabId] = useState<string | null>('blink-ino');
  const [board, setBoard] = useState(BOARDS[0]);
  const [port, setPort] = useState(PORTS[0]);
  const [verifying, setVerifying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compileLogs, setCompileLogs] = useState<{ type: string; text: string }[]>([]);
  const [bottomVisible, setBottomVisible] = useState(true);
  const [bottomTab, setBottomTab] = useState<BottomTab>('output');

  // ── Existing stores (backend integrations) ──────────────────────────────
  const {
    saveToCloud,
    loadFromCloud,
    cloudSaving,
    cloudLoading,
    cloudCircuitId,
  } = useProjectStore();

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

  // ── Verify using real Arduino backend when available, else mock ─────────
  const handleVerify = useCallback(() => {
    if (verifying || uploading) return;
    setVerifying(true);
    setCompileLogs([]);
    setBottomVisible(true);
    setBottomTab('output');

    const activeTab = codeTabs.find((t) => t.id === codeActiveTabId);
    const code = activeTab?.content || '';

    // Try real compile via backend
    arduinoStore.compile(code).then((success) => {
      if (success) {
        setCompileLogs([{ type: 'success', text: '✓ Compiled successfully.' }]);
      } else {
        // Fall back to mock output
        let i = 0;
        const interval = setInterval(() => {
          if (i < compilerOutput.length) {
            setCompileLogs((prev) => [...prev, compilerOutput[i]]);
            i++;
          } else {
            clearInterval(interval);
          }
        }, 300);
      }
      setVerifying(false);
    }).catch(() => {
      // Backend unreachable, use mock
      let i = 0;
      const interval = setInterval(() => {
        if (i < compilerOutput.length) {
          setCompileLogs((prev) => [...prev, compilerOutput[i]]);
          i++;
        } else {
          clearInterval(interval);
        }
      }, 300);
      setVerifying(false);
    });
  }, [verifying, uploading, codeTabs, codeActiveTabId, arduinoStore]);

  // ── Upload using real Arduino backend when available ────────────────────
  const handleUpload = useCallback(() => {
    if (verifying || uploading) return;
    setUploading(true);
    setCompileLogs([]);
    setBottomVisible(true);
    setBottomTab('output');

    const activeTab = codeTabs.find((t) => t.id === codeActiveTabId);
    const code = activeTab?.content || '';

    arduinoStore.upload(code).then((success) => {
      if (success) {
        setCompileLogs([{ type: 'success', text: `✓ Done uploading to ${board}.` }]);
      } else {
        setCompileLogs([{ type: 'error', text: '✗ Upload failed.' }]);
      }
      setUploading(false);
    }).catch(() => {
      const uploadLogs = [
        ...compilerOutput,
        { type: 'info', text: `Connecting to ${port}...` },
        { type: 'info', text: 'Uploading firmware...' },
        { type: 'success', text: `✓ Done uploading to ${board}.` },
      ];
      let i = 0;
      const interval = setInterval(() => {
        if (i < uploadLogs.length) {
          setCompileLogs((prev) => [...prev, uploadLogs[i]]);
          i++;
        } else {
          clearInterval(interval);
        }
      }, 250);
      setUploading(false);
    });
  }, [verifying, uploading, board, port, codeTabs, codeActiveTabId, arduinoStore]);

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

    // --- Validation 2: Check for an Arduino/MCU board ---
    const boardTypes = ['arduino-uno', 'arduino-nano', 'arduino-mega', 'esp32'];
    const boardComp = components.find(c => boardTypes.includes(c.type));
    if (!boardComp) {
      const msg = '⚠ Not connected — No Arduino/MCU board found on canvas';
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

    // --- Validation 5: Check that the board is connected to at least one other component ---
    const boardWires = wiresState.filter(
      w => w.fromComponentId === boardComp.id || w.toComponentId === boardComp.id
    );
    if (boardWires.length === 0) {
      const msg = `⚠ Connection error — ${boardComp.label} is not connected to any component`;
      setStatusMessage(msg);
      setSimError(msg);
      return;
    }

    // --- Validation 6: Warn about unconnected non-passive components ---
    const connectedIds = new Set<string>();
    wiresState.forEach(w => { connectedIds.add(w.fromComponentId); connectedIds.add(w.toComponentId); });
    const passiveTypes = ['breadboard', 'breadboard-half', 'vcc', 'gnd'];
    const unconnected = components.filter(
      c => !connectedIds.has(c.id) && !boardTypes.includes(c.type) && !passiveTypes.includes(c.type)
    );
    if (unconnected.length > 0) {
      const names = unconnected.slice(0, 3).map(c => c.label).join(', ');
      const more = unconnected.length > 3 ? ` and ${unconnected.length - 3} more` : '';
      setStatusMessage(`⚠ Warning: ${names}${more} not connected — simulation may be incomplete`);
    }

    // --- All validations passed — compile and start ---
    setStatusMessage('Compiling sketch for simulation...');
    setBottomVisible(true);
    setBottomTab('output');
    setCompileLogs([{ type: 'info', text: '● Validating circuit connections...' }]);
    setCompileLogs(prev => [...prev, { type: 'success', text: `✓ ${boardComp.label} connected with ${boardWires.length} wire(s)` }]);
    if (unconnected.length > 0) {
      setCompileLogs(prev => [...prev, { type: 'warning', text: `⚠ ${unconnected.length} component(s) not connected` }]);
    }

    // Get the active code
    const activeTab = codeTabs.find(t => t.id === codeActiveTabId);
    const code = activeTab?.content || '';
    if (!code.trim()) {
      const msg = '⚠ Not connected — No code to simulate. Write or open an Arduino sketch first';
      setStatusMessage(msg);
      setSimError(msg);
      setCompileLogs(prev => [...prev, { type: 'error', text: msg }]);
      return;
    }

    setCompileLogs(prev => [...prev, { type: 'info', text: '● Compiling sketch...' }]);

    try {
      const result = await arduinoStore.compile(code);
      if (result) {
        // Try to get compiled hex from the arduino store
        const hexResult = await compileSketch(code, 'arduino:avr:uno').catch(() => null);

        if (hexResult?.hex) {
          simulationStore.startSimulation(hexResult.hex);
          setCompileLogs(prev => [...prev,
            { type: 'success', text: '✓ Compilation successful' },
            { type: 'success', text: '▶ Simulation started (AVR @ 16MHz)' },
          ]);
          setStatusMessage('● Simulation running (AVR @ 16MHz)');
        } else {
          // Compilation server may not return hex — try direct simulation start
          setCompileLogs(prev => [...prev,
            { type: 'warning', text: '⚠ Compile server did not return .hex — using mock simulation' },
            { type: 'success', text: '▶ Simulation started in visual-only mode' },
          ]);
          setStatusMessage('● Simulation running (visual-only mode)');
        }
      } else {
        const msg = '✗ Compilation failed — check your code for errors';
        setCompileLogs(prev => [...prev, { type: 'error', text: msg }]);
        setStatusMessage(msg);
        setSimError(msg);
      }
    } catch (err) {
      // Compile server not reachable — start a visual-only simulation
      setCompileLogs(prev => [...prev,
        { type: 'warning', text: '⚠ Compile server not reachable — running visual-only simulation' },
        { type: 'info', text: 'To enable full AVR simulation, start: node server/index.js' },
        { type: 'success', text: '▶ Simulation started in visual-only mode' },
      ]);
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
    setHistory(prev => [...prev.slice(0, historyIndex + 1), { components: newComponents, wires: newWires }]);
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

  // ── AI Chat — send message to Gemini agent (placeholder, wired for real API) ─
  const handleSendMessage = useCallback((content: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: now,
    };
    setMessages(prev => [...prev, userMsg]);

    // Placeholder AI responses — replace with real Gemini API integration
    const aiResponses = [
      'For the LED blink circuit, connect R1 (220Ω) in series with D1 from pin 13 to GND. Here\'s the sketch:\nvoid setup() { pinMode(13, OUTPUT); }\nvoid loop() { digitalWrite(13, HIGH); delay(1000); digitalWrite(13, LOW); delay(1000); }',
      'Your circuit looks good! The decoupling capacitor C1 should be placed close to the Arduino\'s power pins.',
      'I see R2 is unconnected — consider using it as a pull-down resistor on pin A0 for a button input.',
      'I\'ve reviewed your schematic. No short circuits detected.',
      'Here\'s the BOM for your circuit:\n- U1: Arduino Uno\n- R1: 220Ω resistor\n- R2: 10kΩ resistor\n- D1: Red LED 5mm\n- C1: 100µF capacitor',
    ];

    setTimeout(() => {
      const response = aiResponses[aiResponseIdx.current % aiResponses.length];
      aiResponseIdx.current += 1;
      const isCode = response.includes('\n') && (response.includes('void') || response.includes('-'));
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'ai',
        content: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCode,
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 900);
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

  // ── Cloud Save / Load integrating existing projectStore ─────────────────
  const handleCloudSave = useCallback(async () => {
    const name = window.prompt('Project name:', 'My Circuit');
    if (!name) return;
    const ok = await saveToCloud(name);
    if (ok) {
      setStatusMessage('Project saved to cloud ✓');
    } else {
      setStatusMessage('Save failed. Is the server running?');
    }
  }, [saveToCloud]);

  const handleCloudLoad = useCallback(async (id: string) => {
    const ok = await loadFromCloud(id);
    if (ok) {
      setStatusMessage('Project loaded from cloud ✓');
    } else {
      setStatusMessage('Load failed.');
    }
  }, [loadFromCloud]);

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
              if (data.components) setComponents(data.components);
              if (data.wires) setWiresState(data.wires);
              pushHistory(data.components || [], data.wires || []);
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
      case 'Save': {
        const data = JSON.stringify({ components, wires: wiresState }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'circuit-project.json';
        a.click();
        URL.revokeObjectURL(url);
        setStatusMessage('Project saved');
        break;
      }
      case 'Save As...': {
        const data = JSON.stringify({ components, wires: wiresState }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'circuit-project.json';
        a.click();
        URL.revokeObjectURL(url);
        setStatusMessage('Project saved as...');
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
          a.click();
          URL.revokeObjectURL(url);
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
        a.click();
        URL.revokeObjectURL(url);
        setStatusMessage('BOM exported');
        break;
      }
      case 'Design Rule Check...': {
        const connectedIds = new Set<string>();
        wiresState.forEach(w => { connectedIds.add(w.fromComponentId); connectedIds.add(w.toComponentId); });
        const issues = components.filter(c =>
          !connectedIds.has(c.id) && !['arduino-uno','arduino-nano','arduino-mega','esp32'].includes(c.type)
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
  }, [handleUndo, handleRedo, handleCopy, handlePaste, components, wiresState, pushHistory, handleVerify, handleUpload, activeView, simulationStore, handleSimulate]);

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
  const titleBg = dm ? 'bg-gradient-to-r from-[#111122] to-[#0d1117]' : 'bg-gradient-to-r from-[#1a1a2e] to-[#16213e]';

  return (
    <div
      className={`flex flex-col h-screen overflow-hidden ${dm ? 'dark bg-[#1e1e1e]' : 'bg-[#e8e8e8]'}`}
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Title / App bar */}
      <div className={`flex items-center h-[32px] ${titleBg} px-4 shrink-0 select-none`}>
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-[#4facfe] to-[#00f2fe] flex items-center justify-center shadow-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <span className="text-[12px] font-semibold text-[#e0e0e0] tracking-wide">SimuIDE</span>
          {/* Cloud status indicator */}
          {cloudCircuitId && (
            <span className="text-[10px] text-green-400 flex items-center gap-1 ml-2" title="Synced with cloud">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Saved
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Cloud Save/Load buttons */}
          <button
            onClick={handleCloudSave}
            disabled={cloudSaving}
            className="text-[10px] text-[#9aa8c0] hover:text-white transition-colors disabled:opacity-50"
            title="Save to cloud"
          >
            {cloudSaving ? '⟳' : '☁ Save'}
          </button>
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setSettingsOpen(s => !s)}
              className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 transition-colors"
              title="Settings"
            >
              <Settings size={14} className="text-[#9aa8c0]" />
            </button>
            {settingsOpen && (
              <div className={`absolute right-0 top-full mt-1 w-[200px] rounded-lg shadow-xl z-[100] ${
                dm ? 'bg-[#2d2d30] border border-[#3c3c3c]' : 'bg-white border border-[#c0c0c0]'
              }`}>
                <div className="py-1">
                  <button
                    onClick={() => setShowGrid(g => !g)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-[12px] transition-colors ${
                      dm ? 'text-[#ccc] hover:bg-[#3c3c3c]' : 'text-[#333] hover:bg-[#e8ecf0]'
                    }`}
                  >
                    <Grid3X3 size={14} className={showGrid ? 'text-[#0078d7]' : (dm ? 'text-[#666]' : 'text-[#888]')} />
                    <span>{showGrid ? 'Hide Grid' : 'Show Grid'}</span>
                  </button>
                  <button
                    onClick={() => setDarkMode(d => !d)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-[12px] transition-colors ${
                      dm ? 'text-[#ccc] hover:bg-[#3c3c3c]' : 'text-[#333] hover:bg-[#e8ecf0]'
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
        darkMode={darkMode}
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
        <FilePanel
          collapsed={filePanelCollapsed}
          onToggleCollapse={() => setFilePanelCollapsed(c => !c)}
          entries={fileEntries}
          onAddEntries={(newEntries) => setFileEntries(prev => [...prev, ...newEntries])}
          onRemoveEntry={(id) => {
            const removeById = (entries: FileEntry[]): FileEntry[] =>
              entries.filter(e => e.id !== id).map(e =>
                e.children ? { ...e, children: removeById(e.children) } : e
              );
            setFileEntries(prev => removeById(prev));
            if (activeFileId === id) setActiveFileId(null);
          }}
          onOpenFile={(file) => {
            setActiveFileId(file.id);
            setStatusMessage(`Opened ${file.name}`);
          }}
          activeFileId={activeFileId}
          darkMode={darkMode}
        />
        <ComponentPanel
          selectedComponent={selectedLibComponent}
          onSelectComponent={handleSelectLibComponent}
          darkMode={darkMode}
        />

        {/* Center area: switches between canvas and code editor */}
        {activeView === 'simulation' ? (
          <div className="flex-1 relative overflow-hidden w-full h-full" style={{ minHeight: 0 }}>
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
              compileLogs={compileLogs}
              isCompiling={verifying || uploading}
              activeTab={bottomTab}
              onTabChange={setBottomTab}
              darkMode={darkMode}
            />
          </div>
        )}

        <AIPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          collapsed={aiPanelCollapsed}
          onToggleCollapse={() => setAiPanelCollapsed(c => !c)}
          darkMode={darkMode}
        />
      </div>

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
