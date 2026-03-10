# SimuIDE Web — Frontend Documentation

## Overview

SimuIDE Web is a browser-based Arduino circuit simulator and IDE built with **React 18**, **TypeScript**, **Zustand** for state management, **Tailwind CSS** for styling, and **Vite** as the build tool. It provides a dual-view interface—a circuit diagram canvas with drag-and-drop Wokwi components and an Arduino IDE-style code editor—unified within a single application shell.

---

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│                  React UI Components                      │
│  MenuBar · MainToolbar · CircuitCanvas · ComponentPanel   │
│  AIPanel · FilePanel · Editor · BottomPanel · StatusBar   │
├───────────────────────────────────────────────────────────┤
│                 Zustand State Stores                       │
│  projectStore · diagramStore · editorStore                │
│  arduinoStore · simulationStore                           │
├───────────────────────────────────────────────────────────┤
│                API & Services Layer                        │
│  circuits API · arduino API · simulation service (avr8js) │
├───────────────────────────────────────────────────────────┤
│              Node.js Backend (port 3001)                   │
│  MongoDB persistence · Arduino CLI compile/upload         │
└───────────────────────────────────────────────────────────┘
```

**Data flow:** Components dispatch actions to Zustand stores → Stores manage state and call APIs → Components re-render on state changes.

---

## Folder Structure

```
src/
├── app/
│   ├── App.tsx                        # Main integrated component (dual-view)
│   └── components/
│       ├── AIPanel.tsx                # Gemini AI chat panel
│       ├── CircuitCanvas.tsx          # SVG schematic canvas + Wokwi elements
│       ├── ComponentPanel.tsx         # Component library sidebar
│       ├── FilePanel.tsx              # File explorer / importer
│       ├── MainToolbar.tsx            # Canvas tools & actions
│       ├── MenuBar.tsx                # Menu system (File, Edit, View, etc.)
│       ├── StatusBar.tsx              # Status line (zoom, coordinates, count)
│       └── arduino-ide/
│           ├── ActivityBar.tsx        # Left icon bar (explorer, search, etc.)
│           ├── AIChat.tsx             # AI assistant for code suggestions
│           ├── BottomPanel.tsx        # Output / Problems / Terminal / Serial
│           ├── Editor.tsx             # Tab-based code editor with syntax highlighting
│           ├── Sidebar.tsx            # File tree, search, libraries, boards
│           ├── StatusBar.tsx          # Editor status bar
│           ├── syntaxHighlighter.tsx  # Arduino C++ syntax tokenizer
│           ├── arduinoData.ts         # Arduino library/board data
│           └── data.ts               # Static data for Arduino IDE panels
├── api/
│   ├── arduino.ts                     # Arduino CLI endpoints (compile, upload, ports)
│   └── circuits.ts                    # Circuit CRUD endpoints (MongoDB)
├── constants/
│   ├── components.ts                  # 40+ electronic component definitions
│   └── config.ts                      # App constants (grid, zoom, timing, etc.)
├── hooks/
│   ├── useAutoSave.ts                 # Periodic localStorage auto-save
│   └── useDiagram.ts                  # Diagram query & manipulation helpers
├── services/
│   └── simulation.ts                  # AVR8.js simulator (CPU, UART, GPIO, timers)
├── store/
│   ├── arduinoStore.ts                # Board selection, compile, upload
│   ├── diagramStore.ts                # Nodes & edges for circuit diagram
│   ├── editorStore.ts                 # Code content & language
│   ├── projectStore.ts                # Project lifecycle & cloud sync
│   └── simulationStore.ts            # AVR simulation state
├── types/
│   ├── arduino.ts                     # ArduinoPort, ArduinoBoard, BuildStatus, OutputLine
│   ├── components.ts                  # ComponentDefinition, ComponentCategory
│   ├── diagram.ts                     # DiagramNode, DiagramEdge, DiagramState
│   └── project.ts                     # Project, CreateProjectParams
├── utils/
│   ├── serializer.ts                  # Diagram ↔ MongoDB format converter
│   ├── storage.ts                     # LocalStorage abstraction
│   └── validators.ts                  # Input validation helpers
├── App.tsx                            # Re-exports src/app/App
├── main.tsx                           # Entry point (imports @wokwi/elements)
└── index.css                          # Global styles
```

---

## Entry Point

**`src/main.tsx`** — Mounts the React app and imports `@wokwi/elements` to register Wokwi web components globally.

**`src/app/App.tsx`** — The main application component. Manages:

| Concern | Details |
|---------|---------|
| **View modes** | `simulation` (circuit canvas) and `code-editor` (Arduino IDE) |
| **Canvas state** | Placed components, wires, selected library component, active tool |
| **Editor state** | Open tabs, active tab, board selection, serial port |
| **UI state** | Zoom, dark mode, grid visibility, panel collapse states |
| **History** | Undo/redo stack tracking `{ components, wires }` snapshots |
| **AI chat** | Message history (placeholder — ready for Gemini API) |
| **Clipboard** | Copy/paste for multi-component selections |

---

## Components

### Layout & Navigation

| Component | File | Purpose |
|-----------|------|---------|
| **MenuBar** | `app/components/MenuBar.tsx` | Full menu system — File, Edit, View, Place, Simulate, Tools, Help. Centered tab toggle for Simulation / Code Editor view. |
| **MainToolbar** | `app/components/MainToolbar.tsx` | Canvas tools (Select, Wire, Pan, Delete), zoom controls, undo/redo, verify/upload/debug/simulate buttons. |
| **StatusBar** | `app/components/StatusBar.tsx` | Displays status message, component count, cursor coordinates, zoom percentage. |

### Circuit Design

| Component | File | Purpose |
|-----------|------|---------|
| **CircuitCanvas** | `app/components/CircuitCanvas.tsx` | SVG-based schematic canvas. Renders Wokwi web components (`<wokwi-led>`, `<wokwi-resistor>`, etc.). Supports drag-and-drop placement, pin-snap wiring (`SNAP_THRESHOLD = 20px`), zoom/pan, component property editing, and breadboard support. ~1350 lines. |
| **ComponentPanel** | `app/components/ComponentPanel.tsx` | Categorized component library (Basic, ICs, Display, Sensors, Actuators, Modules) with search and favorites. Drag a component to select it for placement. |
| **FilePanel** | `app/components/FilePanel.tsx` | File browser with folder tree, file upload, and search. Supports import/export of project files. |

### AI Assistant

| Component | File | Purpose |
|-----------|------|---------|
| **AIPanel** | `app/components/AIPanel.tsx` | Collapsible Gemini AI chat panel. Model selector, suggested prompts, message history. Currently uses placeholder responses — wire to Gemini API for production. |

### Arduino IDE (Code Editor View)

| Component | File | Purpose |
|-----------|------|---------|
| **Editor** | `app/components/arduino-ide/Editor.tsx` | Tab-based code editor with line numbers and syntax highlighting via custom tokenizer. |
| **BottomPanel** | `app/components/arduino-ide/BottomPanel.tsx` | Tabbed output area — Output (compilation), Problems, Terminal, Serial Monitor. |
| **ActivityBar** | `app/components/arduino-ide/ActivityBar.tsx` | Left-side icon bar for Explorer, Search, Source Control, Extensions, Boards, Libraries. |
| **Sidebar** | `app/components/arduino-ide/Sidebar.tsx` | Context-dependent panel (file tree, search results, library/board browser). |
| **AIChat** | `app/components/arduino-ide/AIChat.tsx` | AI assistant integrated into the code editor for code-related suggestions. |

---

## State Stores (Zustand)

### projectStore

Manages project lifecycle and cloud synchronization.

| State | Type | Description |
|-------|------|-------------|
| `currentProject` | `Project \| null` | Active project |
| `isSaved` | `boolean` | Whether unsaved changes exist |
| `cloudCircuitId` | `string \| null` | MongoDB document ID |
| `cloudSaving` / `cloudLoading` | `boolean` | Operation in progress |
| `cloudError` | `string \| null` | Last sync error |

| Action | Description |
|--------|-------------|
| `createProject(params)` | Initialize a new project |
| `saveToCloud(projectName)` | Persist to MongoDB via circuits API |
| `loadFromCloud(id)` | Retrieve from MongoDB by document ID |

### diagramStore

Manages circuit diagram nodes (components) and edges (wires).

| State | Type | Description |
|-------|------|-------------|
| `nodes` | `DiagramNode[]` | Placed circuit components |
| `edges` | `DiagramEdge[]` | Wire connections |
| `selectedNodeId` / `selectedEdgeId` | `string \| null` | Current selection |

| Action | Description |
|--------|-------------|
| `addNode` / `removeNode` | Add or remove a component |
| `addEdge` / `removeEdge` | Add or remove a connection |
| `updateNode(id, updates)` | Modify component properties |
| `clearDiagram()` | Reset the entire circuit |

### editorStore

Manages code editor content.

| State | Type | Description |
|-------|------|-------------|
| `code` | `string` | Current sketch source code |
| `language` | `"c" \| "cpp" \| "python"` | Active language |
| `hasChanges` | `boolean` | Dirty flag |

### arduinoStore

Manages Arduino board/port selection and compilation/upload operations.

| State | Type | Description |
|-------|------|-------------|
| `boards` | `ArduinoBoard[]` | Available boards (Uno, Nano, Mega, ESP32, etc.) |
| `selectedBoard` / `selectedPort` | `string` | Target device |
| `compileStatus` / `uploadStatus` | `"idle" \| "running" \| "success" \| "error"` | Operation state |
| `outputLog` | `OutputLine[]` | Build output lines |

| Action | Description |
|--------|-------------|
| `compile(code)` | Compile sketch via `/api/arduino/compile` |
| `upload(code)` | Upload to board via `/api/arduino/upload` |
| `refreshPorts()` | Detect connected serial ports |

### simulationStore

Manages AVR simulation powered by avr8js.

| State | Type | Description |
|-------|------|-------------|
| `isRunning` | `boolean` | Simulation active |
| `serialOutput` | `string` | UART output |
| `pinStates` | `Record<string, boolean>` | GPIO pin values |
| `simulator` | `ArduinoSimulator \| null` | Simulator instance |

| Action | Description |
|--------|-------------|
| `startSimulation(hex)` | Load Intel HEX and run at 60 FPS |
| `stopSimulation()` | Halt execution |
| `setPin(port, pin, high)` | Set GPIO input state |

---

## API Layer

### Circuits API (`src/api/circuits.ts`)

Communicates with the Node.js backend for MongoDB persistence.

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `saveCircuit(data)` | POST | `/api/circuits` | Create or update a circuit document |
| `listCircuits()` | GET | `/api/circuits` | List all saved circuits |
| `loadCircuit(id)` | GET | `/api/circuits/{id}` | Load a circuit by ID |
| `deleteCircuit(id)` | DELETE | `/api/circuits/{id}` | Delete a circuit |

**Save payload:**
```typescript
{
  _id?: string;           // Existing document ID (for updates)
  projectName: string;
  code: string;
  language: "c" | "cpp" | "python";
  components: Array<{ nodeId, type, componentType, label, position, properties, handles }>;
  connections: Array<{ edgeId, from, to, type }>;
}
```

### Arduino API (`src/api/arduino.ts`)

Communicates with the Node.js backend for Arduino CLI operations.

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `fetchPorts()` | GET | `/api/arduino/ports` | Detect connected serial ports |
| `compileSketch(code, fqbn)` | POST | `/api/arduino/compile` | Compile an Arduino sketch |
| `uploadSketch(code, fqbn, port)` | POST | `/api/arduino/upload` | Upload compiled sketch to board |

---

## Services

### Simulation Service (`src/services/simulation.ts`)

**Class: `ArduinoSimulator`** — AVR8.js-based Arduino simulator running in the browser.

- **`loadHex(hex)`** — Parse Intel HEX format into program memory
- **`start()`** — Begin execution loop at 60 FPS (~266K cycles/frame at 16 MHz)
- **`stop()`** — Halt execution
- **`reset()`** — CPU reset
- **`setPin(port, pin, high)`** — Set GPIO input state

**Simulated peripherals:** AVRClock (16 MHz), AVRIOPort (B, C, D), AVRUSART (Serial), AVRTimer (0, 1, 2)

**Callbacks:**
- `onSerialOutput(char)` — Fired on UART transmission
- `onPinChange(port, pin, value)` — Fired on GPIO state change

---

## Hooks

| Hook | Purpose |
|------|---------|
| `useAutoSave(enabled)` | Auto-saves project to localStorage every 30 seconds when dirty. Returns `{ manualSave(), getLastSaveTime() }`. |
| `useDiagram()` | Provides diagram query/manipulation utilities: `nodeCount`, `edgeCount`, `selectedNode`, `hasConnections(id)`, `getConnectedNodes(id)`, `duplicateNode(id)`, `clearDiagram()`, `statistics`. |

---

## Key Data Flows

### Placing a Component

```
User clicks component in ComponentPanel
  → App.handleSelectLibComponent() stores selection
  → User clicks on CircuitCanvas
  → CircuitCanvas.handlePlaceComponent() creates PlacedComponent
  → App.handlePlaceComponent() adds to state + pushes history
  → Canvas re-renders with new component
```

### Drawing Wires

```
User selects Wire tool in MainToolbar
  → CircuitCanvas detects pin proximity (SNAP_THRESHOLD = 20px)
  → User connects from pin → to pin
  → CircuitCanvas.handleAddWire() creates Wire object
  → App.handleUpdateWires() updates state + pushes history
```

### Arduino Compilation

```
User clicks Verify in toolbar/editor
  → App.handleVerify() gets code from active tab
  → arduinoStore.compile(code) → POST /api/arduino/compile
  → Node.js backend invokes Arduino CLI
  → Compiler output → OutputLine[] → BottomPanel displays results
```

### Cloud Save / Load

```
Save: projectStore.saveToCloud(name)
  → Transforms diagram data to MongoDB format
  → POST /api/circuits → MongoDB stores document → returns ID
  → cloudCircuitId saved for future updates

Load: projectStore.loadFromCloud(id)
  → GET /api/circuits/{id} → MongoDB returns document
  → Transforms back to internal state → stores + components update
```

### Simulation

```
User starts simulation
  → simulationStore.startSimulation(hex)
  → ArduinoSimulator.loadHex() parses Intel HEX
  → ArduinoSimulator.start() → requestAnimationFrame loop at 60 FPS
  → onSerialOutput / onPinChange callbacks update store
  → Serial Monitor + pin visualizations re-render
```

---

## Constants & Configuration

### App Config (`src/constants/config.ts`)

| Constant | Value | Description |
|----------|-------|-------------|
| `APP_NAME` | `"SimuIDE Web"` | Application title |
| `APP_VERSION` | `"0.1.0"` | Version string |
| `AUTO_SAVE_INTERVAL` | `30000` | Auto-save interval (ms) |
| `CANVAS_GRID_SIZE` | `20` | Grid snap size (px) |
| `CANVAS_ZOOM_MIN` / `CANVAS_ZOOM_MAX` | `0.1` / `2` | Zoom range |
| `EDITOR_FONT_SIZE` | `14` | Editor font size (px) |
| `EDITOR_THEME` | `"vs-dark"` | Editor color theme |
| `MAX_NODES` / `MAX_EDGES` | `100` / `200` | Diagram limits |
| `SIMULATION_TICK_RATE` | `1000` | Simulation tick interval (ms) |

### Component Library (`src/constants/components.ts`)

Defines **40+ electronic components** organized by category:

- **Basic:** Wire, Ground, VCC
- **Passive:** Resistor, Capacitor, Inductor
- **Active:** Diode, LED, Transistor
- **ICs:** Arduino Uno, Arduino Nano, Arduino Mega, ESP32
- **Input:** Push Button, Potentiometer, Slider Switch
- **Output:** Servo Motor, Buzzer
- **Display:** 7-Segment, LCD 16x2/20x4, OLED, LED Matrix
- **Sensors:** Ultrasonic, DHT22, PIR, IR, Temperature, Flame, Gas, Light, Sound, MPU6050
- **Actuators:** Stepper Motor, Joystick, Rotary Encoder, Keypad
- **Modules:** RTC DS1307, HX711, MicroSD

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.3.1 | UI framework |
| `react-dom` | 18.3.1 | DOM rendering |
| `zustand` | 5.0.3 | State management |
| `@xyflow/react` | 12.4.4 | Diagram canvas (nodes/edges) |
| `@monaco-editor/react` | 4.7.0 | Monaco code editor (alternative) |
| `lucide-react` | 0.577.0 | Icon library |
| `@wokwi/elements` | 1.9.2 | Arduino circuit component web elements |
| `avr8js` | 0.21.0 | AVR CPU simulator |
| `tailwindcss` | 3.4.17 | Utility-first CSS framework |
| `typescript` | 5.6.2 | Type system |
| `vite` | 6.1.0 | Build tool & dev server |

---

## Build & Development

```bash
# Install dependencies
npm install

# Start frontend dev server only (port 5173)
npm run dev

# Start frontend + backend concurrently
npm run dev:full

# Type-check
npx tsc --noEmit

# Production build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

### Vite Configuration

- **Path alias:** `@` → `./src`
- **API proxy:** `/api/*` → `http://localhost:3001` (Node.js backend)
- **Plugin:** `@vitejs/plugin-react`

### Tailwind Configuration

- **Theme:** VS Code dark theme colors (`vs-dark`, `vs-gray`)
- **Accent palette:** Green, blue, orange, purple, red
- **Font:** Fira Code (monospace)
- **Custom:** Shadows, keyframes for animations

---

## Notes

- The **AIPanel** currently uses placeholder mock responses. Wire it to the Gemini API for production use.
- The old layout components (`src/components/layout/`) still exist in the codebase but are no longer in the render tree.
- The `@xyflow/react` and `@monaco-editor/react` packages remain installed and can be re-integrated if needed—the current UI uses the reference repo's custom canvas and editor instead.
- Dark mode defaults to enabled and is toggleable via the View menu.
