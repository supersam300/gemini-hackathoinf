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
      
      const result = await response.json();
      
      if (result.success) {
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

  const executeAIActions = useCallback((content: string) => {
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
      if (!jsonMatch) return;
      
      const data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      if (!data.actions || !Array.isArray(data.actions)) return;

      data.actions.forEach((action: any) => {
        switch (action.type) {
          case 'PLACE_COMPONENT': {
            const newComp: PlacedComponent = {
              id: `${action.componentType}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              type: action.componentType,
              x: action.x || 100,
              y: action.y || 100,
              label: action.label || action.componentType.toUpperCase(),
              selected: false,
              rotation: 0,
              attrs: action.properties || {},
            };
            setComponents(prev => [...prev, newComp]);
            setStatusMessage(`AI placed ${action.componentType}`);
            break;
          }
          case 'ADD_WIRE': {
            const [fromId, fromPinName] = action.from.split(':');
            const [toId, toPinName] = action.to.split(':');
            if (fromId && toId) {
              const newWire: Wire = {
                id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                fromComponentId: fromId,
                fromPinName: fromPinName || 'in-0',
                toComponentId: toId,
                toPinName: toPinName || 'out-0',
                color: 'red',
              };
              setWiresState(prev => [...prev, newWire]);
              setStatusMessage('AI added a wire');
            }
            break;
          }
          case 'START_SIMULATION':
            handleSimulate();
            break;
          case 'STOP_SIMULATION':
            simulationStore.stopSimulation();
            break;
          default:
            console.warn('Unknown AI action:', action.type);
        }
      });
    } catch (e) {
      console.error('Failed to execute AI actions:', e);
    }
  }, [handleSimulate, simulationStore]);

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
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
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
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        setStatusMessage('Project saved as...');
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
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="text-[12px] font-semibold text-[#e0e0e0] tracking-wide">SimuIDE</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Cloud Save/Load buttons */}
          <button
            onClick={handleCloudSave}
            className="text-[10px] text-[#9aa8c0] hover:text-white transition-colors"
            title="Save to cloud"
          >
            ☁ Save
          </button>
          <button
            onClick={() => setLoadDialogOpen(true)}
            className="text-[10px] text-[#9aa8c0] hover:text-white transition-colors"
            title="Load a saved workspace"
          >
            ☁ Load
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
