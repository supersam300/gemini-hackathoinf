# MongoDB Integration Guide

This document explains how to export circuit diagrams to MongoDB-compatible JSON format.

## Overview

The circuit diagram data has been enhanced with MongoDB export capabilities. When you save a circuit, the components (with their coordinates and types) and connections are stored in a structure optimized for MongoDB storage.

## Data Structure

### MongoDB Document Format

```json
{
  "_id": "circuit_proj_001_1709521800000",
  "projectId": "proj_001",
  "projectName": "LED Circuit",
  "createdAt": "2026-03-04T10:30:00Z",
  "updatedAt": "2026-03-04T10:45:30Z",
  "components": [
    {
      "_id": "proj_001_node_1",
      "nodeId": "node-led-1709521800000",
      "type": "componentNode",
      "componentType": "led",
      "label": "LED",
      "position": {
        "x": 120,
        "y": 85
      },
      "properties": {
        "color": "red"
      },
      "handles": {
        "inputs": ["in-0"],
        "outputs": ["out-0"]
      }
    }
  ],
  "connections": [
    {
      "_id": "proj_001_edge_1",
      "edgeId": "edge-...",
      "from": {
        "nodeId": "node-vcc-...",
        "componentType": "vcc",
        "handle": "out-0"
      },
      "to": {
        "nodeId": "node-led-...",
        "componentType": "led",
        "handle": "in-0"
      },
      "type": "connection"
    }
  ],
  "metadata": {
    "version": "1.0",
    "simulationSettings": {
      "totalTime": 10,
      "timeStep": 0.001
    },
    "author": "user123",
    "isPublic": false
  }
}
```

## Key Fields

### Components Array
- **_id**: Unique MongoDB document ID
- **nodeId**: React Flow node ID (matches internal state)
- **componentType**: The specific component (e.g., "led", "resistor", "vcc", "ground")
- **label**: Human-readable name (e.g., "LED", "Resistor 1")
- **position**: {x, y} coordinates on canvas
- **properties**: Component-specific configuration
- **handles**: Input/output connection points

### Connections Array
- **_id**: Unique MongoDB document ID
- **from**: Source component and handle
- **to**: Target component and handle
- **type**: Connection type (always "connection" for now)

## Usage

### In React Components

```tsx
import { storage } from "../../utils/storage";
import { useDiagramStore } from "../../store/diagramStore";

export function ExportButton() {
  const diagram = useDiagramStore();

  const handleExportMongoDB = () => {
    // Export as JSON string (ready to send to backend)
    const jsonString = storage.exportDiagramToMongoDB(
      diagram,
      "proj_myproject",
      "My Circuit"
    );
    console.log(jsonString);
    // Send to backend API endpoint
    // fetch('/api/circuits', { method: 'POST', body: jsonString })
  };

  const handleDownloadMongoDB = () => {
    // Download as file to your computer
    storage.downloadMongoDBJSON(
      diagram,
      "proj_myproject",
      "My Circuit"
    );
  };

  return (
    <>
      <button onClick={handleExportMongoDB}>Export as MongoDB JSON</button>
      <button onClick={handleDownloadMongoDB}>Download MongoDB JSON</button>
    </>
  );
}
```

### Available Functions

#### `storage.exportDiagramToMongoDB(diagram, projectId, projectName)`
Returns a JSON string in MongoDB document format.

**Parameters:**
- `diagram`: DiagramState object
- `projectId`: (optional) Project identifier
- `projectName`: (optional) Human-readable project name

**Returns:** JSON string

#### `storage.exportDiagramToMongoDBObject(diagram, projectId, projectName)`
Returns a MongoDB document as a JavaScript object.

**Returns:** JavaScript object (can be sent directly to Mongoose/MongoDB)

#### `storage.downloadMongoDBJSON(diagram, projectId, projectName)`
Automatically downloads the MongoDB JSON as a file.

**Example filename:** `proj_myproject-mongodb-1709521800000.json`

## Sending to Backend

### Node.js / Express Example

```javascript
// Backend endpoint to save circuit to MongoDB
app.post('/api/circuits', async (req, res) => {
  const circuit = req.body;
  
  try {
    // Circuit document structure matches our export format
    const savedCircuit = await Circuit.create({
      _id: circuit._id,
      projectId: circuit.projectId,
      projectName: circuit.projectName,
      createdAt: circuit.createdAt,
      updatedAt: circuit.updatedAt,
      components: circuit.components,
      connections: circuit.connections,
      metadata: circuit.metadata,
    });
    
    res.json({ success: true, id: savedCircuit._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Mongoose Schema

```javascript
const circuitSchema = new Schema({
  _id: String,
  projectId: String,
  projectName: String,
  createdAt: Date,
  updatedAt: Date,
  description: String,
  tags: [String],
  components: [
    {
      _id: String,
      nodeId: String,
      type: String,
      componentType: String,
      label: String,
      position: {
        x: Number,
        y: Number,
      },
      properties: Schema.Types.Mixed,
      handles: {
        inputs: [String],
        outputs: [String],
      },
    },
  ],
  connections: [
    {
      _id: String,
      edgeId: String,
      from: {
        nodeId: String,
        componentType: String,
        handle: String,
      },
      to: {
        nodeId: String,
        componentType: String,
        handle: String,
      },
      type: String,
    },
  ],
  metadata: Schema.Types.Mixed,
});
```

## Example MongoDB Queries

### Find all circuits for a project
```javascript
db.circuits.find({ projectId: "proj_001" })
```

### Find circuits using a specific component
```javascript
db.circuits.find({ "components.componentType": "led" })
```

### Find circuits with connections between specific component types
```javascript
db.circuits.find({
  $and: [
    { "connections.from.componentType": "vcc" },
    { "connections.to.componentType": "resistor" }
  ]
})
```

### Get component positions for a circuit
```javascript
db.circuits.find(
  { _id: "circuit_proj_001_..." },
  { "components.label": 1, "components.position": 1 }
)
```

## Files Modified

- `src/utils/serializer.ts` - Added `exportToMongoDB()` and `exportToMongoDBJSON()`
- `src/utils/storage.ts` - Added MongoDB export and download functions
- `examples/circuit-diagram-mongodb.json` - Example document structure

## See Also

- [examples/circuit-diagram-mongodb.json](../examples/circuit-diagram-mongodb.json) - Sample MongoDB document
- Main diagram storage format is in `src/types/diagram.ts`
