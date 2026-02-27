# SimuIDE Web - Project Structure

## Overview
Web-based circuit simulator and IDE similar to Wokwi. Users can drag and drop components, design circuits, code microcontrollers, compile and upload code.

## Sprint 1 Goals (Framework)
- Application layout and structure
- Diagram canvas with drag-and-drop
- Code editor integration (Monaco)
- Save/Load functionality (localStorage)

## Technology Stack
- **Frontend Framework**: React 18 + TypeScript + Vite
- **Diagram Canvas**: React Flow
- **Code Editor**: Monaco Editor
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

## Project Directory Structure

```
simuIide-web/
├── public/
│   └── assets/
│       └── components/          # Component icons/images
├── src/
│   ├── assets/
│   │   └── icons/              # UI icons
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx      # Top navigation bar
│   │   │   ├── Sidebar.tsx     # Component palette
│   │   │   └── Layout.tsx      # Main layout wrapper
│   │   ├── diagram/
│   │   │   ├── Canvas.tsx      # React Flow canvas
│   │   │   ├── ComponentNode.tsx  # Custom node component
│   │   │   └── ConnectionEdge.tsx # Custom edge component
│   │   ├── editor/
│   │   │   ├── CodeEditor.tsx  # Monaco editor wrapper
│   │   │   └── EditorToolbar.tsx  # Editor controls
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Panel.tsx
│   │       └── Toolbar.tsx
│   ├── store/
│   │   ├── diagramStore.ts     # Diagram state (Zustand)
│   │   ├── editorStore.ts      # Editor state
│   │   └── projectStore.ts     # Project state
│   ├── types/
│   │   ├── components.ts       # Component type definitions
│   │   ├── diagram.ts          # Diagram type definitions
│   │   └── project.ts          # Project type definitions
│   ├── utils/
│   │   ├── storage.ts          # localStorage utilities
│   │   ├── serializer.ts       # Project serialization
│   │   └── validators.ts       # Input validation
│   ├── hooks/
│   │   ├── useAutoSave.ts      # Auto-save hook
│   │   └── useDiagram.ts       # Diagram utilities
│   ├── constants/
│   │   ├── components.ts       # Available components
│   │   └── config.ts           # App configuration
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── README.md
└── PROJECT_STRUCTURE.md        # This file
```

## Team Responsibilities (5 People)

### Person 1: Project Setup & Configuration
- Initialize Vite + React + TypeScript project
- Install dependencies (React Flow, Monaco, Zustand, Tailwind)
- Configure TypeScript, Vite, Tailwind
- Set up folder structure
- Create basic types and constants

### Person 2: Layout & Component Palette (Sidebar)
- Create `Layout.tsx`, `Header.tsx`, `Sidebar.tsx`
- Design component palette with draggable items
- Implement basic UI components (Button, Panel, Toolbar)
- Style with Tailwind CSS

### Person 3: Diagram Canvas
- Integrate React Flow
- Create `Canvas.tsx` with drag-and-drop functionality
- Implement `ComponentNode.tsx` and `ConnectionEdge.tsx`
- Handle node/edge interactions
- Connect to `diagramStore` (Zustand)

### Person 4: Code Editor
- Integrate Monaco Editor
- Create `CodeEditor.tsx` wrapper
- Implement `EditorToolbar.tsx` with basic controls
- Connect to `editorStore` (Zustand)
- Add syntax highlighting for C/C++

### Person 5: State Management & Persistence
- Create Zustand stores (`diagramStore`, `editorStore`, `projectStore`)
- Implement localStorage utilities (`storage.ts`, `serializer.ts`)
- Create auto-save functionality (`useAutoSave.ts`)
- Implement save/load features
- Add project export/import

## Setup Instructions

### 1. Clone Repository
```bash
git clone https://github.com/supersam300/simulide-web.git
cd simulide-web
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Required Dependencies
```bash
npm install react react-dom
npm install -D typescript @types/react @types/react-dom
npm install -D vite @vitejs/plugin-react
npm install reactflow
npm install @monaco-editor/react
npm install zustand
npm install -D tailwindcss postcss autoprefixer
npm install lucide-react  # For icons
```

### 4. Initialize Tailwind
```bash
npx tailwindcss init -p
```

### 5. Run Development Server
```bash
npm run dev
```
## Resources
- [React Flow Docs](https://reactflow.dev/)
- [Monaco Editor Docs](https://microsoft.github.io/monaco-editor/)
- [Zustand Docs](https://docs.pmnd.rs/zustand/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Vite Docs](https://vitejs.dev/)
