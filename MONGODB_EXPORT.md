# MongoDB Integration Guide

This document explains how SimuIDE connects to MongoDB Atlas to **save and load** circuit diagrams and code.

## Overview

SimuIDE uses a MongoDB Atlas cluster to persist circuits. When you click **💾 Save** in the header, the app serializes:
- All canvas components (type, label, x/y position, handles)
- All wire connections between components
- The code from the IDE editor (including the language setting)

When you click **📂 Load**, a dialog lists all saved circuits — click one to restore the full canvas and code.

---

## Setup

### 1. Create a MongoDB Atlas Cluster

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign in (or create a free account)
2. Create a **free M0 cluster**
3. Under **Database Access** → create a user with a password
4. Under **Network Access** → add `0.0.0.0/0` (allow from anywhere)
5. Click **Connect** → **Drivers** → copy the connection string

### 2. Configure the Server

Create a `server/.env` file:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/simulide?retryWrites=true&w=majority
```

### 3. Start the App

```bash
# Terminal 1 — Backend
cd server && npm install && node index.js

# Terminal 2 — Frontend
npm run dev
```

Or use the combined command:
```bash
npm run dev:full
```

---

## REST API Endpoints

All endpoints are served by the Express backend at `http://localhost:3001` and proxied through Vite at `/api/circuits`.

| Method   | Path                 | Description                          | Body / Response                                    |
|----------|----------------------|--------------------------------------|----------------------------------------------------|
| `POST`   | `/api/circuits`      | Save a new circuit or update existing | Body: `{ projectName, code, language, components, connections, _id? }` → `{ success, id, circuit }` |
| `GET`    | `/api/circuits`      | List all saved circuits (summary)    | → `{ success, circuits: [{ _id, projectName, language, componentCount, createdAt, updatedAt }] }` |
| `GET`    | `/api/circuits/:id`  | Load a single circuit (full doc)     | → `{ success, circuit }` |
| `DELETE` | `/api/circuits/:id`  | Delete a saved circuit               | → `{ success }` |

---

## Data Structure

### MongoDB Document Format

Each saved circuit is stored as a document in the `circuits` collection:

```json
{
  "_id": "665a1b2c3d4e5f6a7b8c9d0e",
  "projectName": "LED Circuit",
  "code": "void setup() { pinMode(13, OUTPUT); }\nvoid loop() { ... }",
  "language": "cpp",
  "components": [
    {
      "nodeId": "node-led-1709521800000",
      "type": "componentNode",
      "componentType": "led",
      "label": "LED",
      "position": { "x": 120, "y": 85 },
      "properties": { "color": "red" },
      "handles": {
        "inputs": ["in-0"],
        "outputs": ["out-0"]
      }
    }
  ],
  "connections": [
    {
      "edgeId": "edge-vcc-resistor-1709521804000",
      "from": {
        "nodeId": "node-vcc-1709521802000",
        "componentType": "vcc",
        "handle": "out-0"
      },
      "to": {
        "nodeId": "node-resistor-1709521801000",
        "componentType": "resistor",
        "handle": "in-0"
      },
      "type": "connection"
    }
  ],
  "metadata": {},
  "createdAt": "2026-03-05T10:30:00.000Z",
  "updatedAt": "2026-03-05T10:45:30.000Z"
}
```

### Key Fields

#### Top-Level
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Auto-generated MongoDB ID |
| `projectName` | String | User-provided project name |
| `code` | String | Arduino/C++/Python source code from the editor |
| `language` | String | `"c"`, `"cpp"`, or `"python"` |
| `components` | Array | Canvas nodes with positions |
| `connections` | Array | Wire edges linking nodes |
| `createdAt` | Date | Auto-generated timestamp |
| `updatedAt` | Date | Auto-updated on save |

#### Components Array
| Field | Description |
|-------|-------------|
| `nodeId` | React Flow node ID |
| `componentType` | Component kind: `"led"`, `"resistor"`, `"vcc"`, `"ground"`, etc. |
| `label` | Display name |
| `position` | `{ x, y }` canvas coordinates |
| `properties` | Component-specific config (e.g. resistance, color) |
| `handles` | Input/output connection points |

#### Connections Array
| Field | Description |
|-------|-------------|
| `edgeId` | React Flow edge ID |
| `from` | Source `{ nodeId, componentType, handle }` |
| `to` | Target `{ nodeId, componentType, handle }` |

---

## Mongoose Schema

Located at `server/models/Circuit.js`:

```javascript
const circuitSchema = new mongoose.Schema({
    projectName: { type: String, required: true },
    code:        { type: String, default: "" },
    language:    { type: String, default: "cpp", enum: ["c", "cpp", "python"] },
    components: [{
        nodeId: String,
        type: { type: String, default: "componentNode" },
        componentType: String,
        label: String,
        position: { x: Number, y: Number },
        properties: mongoose.Schema.Types.Mixed,
        handles: { inputs: [String], outputs: [String] },
    }],
    connections: [{
        edgeId: String,
        from: { nodeId: String, componentType: String, handle: String },
        to:   { nodeId: String, componentType: String, handle: String },
        type: { type: String, default: "connection" },
    }],
    metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
```

---

## Frontend Usage

### Save (from Header)

The **💾 Save** button in the header calls `projectStore.saveToCloud(name)`, which:

1. Reads `diagramStore` → serializes all nodes (with positions) and edges
2. Reads `editorStore` → captures the current code and language
3. Sends a `POST /api/circuits` request
4. Stores the returned `_id` so subsequent saves **update** the same document

### Load (from Header)

The **📂 Load** button opens `LoadDialog`, which:

1. Fetches `GET /api/circuits` to list all saved circuits
2. Displays project name, component count, language, and last-updated date
3. On click → calls `projectStore.loadFromCloud(id)`:
   - Fetches `GET /api/circuits/:id`
   - Restores nodes/edges to `diagramStore`
   - Restores code/language to `editorStore`
   - Canvas re-renders via `useEffect` sync

### API Client

Located at `src/api/circuits.ts`:

```typescript
import { saveCircuit, listCircuits, loadCircuit, deleteCircuit } from "../api/circuits";

// Save
const result = await saveCircuit({ projectName: "My Circuit", code, language, components, connections });

// List
const { circuits } = await listCircuits();

// Load
const { circuit } = await loadCircuit(circuitId);

// Delete
await deleteCircuit(circuitId);
```

---

## Example MongoDB Queries

```javascript
// Find all circuits
db.circuits.find({})

// Find circuits by name
db.circuits.find({ projectName: /LED/i })

// Find circuits using a specific component
db.circuits.find({ "components.componentType": "led" })

// Find circuits with connections between specific types
db.circuits.find({
  $and: [
    { "connections.from.componentType": "vcc" },
    { "connections.to.componentType": "resistor" }
  ]
})

// Get component positions only
db.circuits.find(
  { _id: ObjectId("...") },
  { "components.label": 1, "components.position": 1 }
)
```

---

## Architecture

```
Header.tsx                          server/index.js
  💾 Save ──→ projectStore          ├── /api/circuits (routes/circuits.js)
               │  saveToCloud()     │     POST   → Circuit.create / findByIdAndUpdate
               │  reads diagram     │     GET    → Circuit.find (list)
               │  reads editor      │     GET:id → Circuit.findById
               │  POST /api/circuits│     DELETE → Circuit.findByIdAndDelete
               │                    │
  📂 Load ──→ LoadDialog            ├── models/Circuit.js (Mongoose schema)
               │  GET /api/circuits │
               │  loadFromCloud()   └── db.js (MongoDB Atlas connection)
               │  restores diagram
               │  restores editor
               ▼
            Canvas.tsx (useEffect resync)
```

## Files

### Backend
| File | Purpose |
|------|---------|
| `server/db.js` | Mongoose connection to Atlas |
| `server/models/Circuit.js` | Circuit schema/model |
| `server/routes/circuits.js` | CRUD REST endpoints |
| `server/index.js` | Mounts routes, connects to DB |

### Frontend
| File | Purpose |
|------|---------|
| `src/api/circuits.ts` | Typed fetch wrappers |
| `src/store/projectStore.ts` | `saveToCloud()` / `loadFromCloud()` actions |
| `src/components/layout/Header.tsx` | Save/Load buttons |
| `src/components/layout/LoadDialog.tsx` | Load circuit modal |
| `src/components/diagram/Canvas.tsx` | Re-syncs nodes/edges on load |

### Config
| File | Purpose |
|------|---------|
| `server/.env` | `MONGODB_URI` (not committed) |
| `.env.example` | Template with placeholder |

## See Also

- [examples/circuit-diagram-mongodb.json](./examples/circuit-diagram-mongodb.json) — Sample MongoDB document
- Main diagram types in `src/types/diagram.ts`
