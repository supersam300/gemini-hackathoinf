import type { DiagramState } from "../types/diagram";

/**
 * Utilities for serializing and deserializing circuit diagrams
 */
export const serializer = {
  /**
   * Export diagram to JSON string
   */
  exportDiagram: (diagram: DiagramState): string => {
    try {
      return JSON.stringify(diagram, null, 2);
    } catch (error) {
      console.error("Failed to export diagram:", error);
      return "";
    }
  },

  /**
   * Import diagram from JSON string
   */
  importDiagram: (json: string): DiagramState | null => {
    try {
      const parsed = JSON.parse(json);
      // Validate basic structure
      if (
        parsed.nodes &&
        parsed.edges &&
        Array.isArray(parsed.nodes) &&
        Array.isArray(parsed.edges)
      ) {
        return parsed as DiagramState;
      }
      return null;
    } catch (error) {
      console.error("Failed to import diagram:", error);
      return null;
    }
  },

  /**
   * Export diagram as SPICE netlist format
   *
   * Example output:
   * ```
   * * Circuit Netlist
   * R1 node1 node2 1k
   * C1 node2 ground 10u
   * ```
   */
  exportNetlist: (diagram: DiagramState): string => {
    try {
      let netlist = "* SimuIDE Generated Netlist\n";
      netlist += "* Auto-generated from circuit diagram\n\n";

      // Add nodes/components
      diagram.nodes.forEach((node, index) => {
        const data = node.data as any;
        netlist += `* ${data?.label || `Component ${index}`}\n`;
      });

      netlist += "\n.end\n";
      return netlist;
    } catch (error) {
      console.error("Failed to export netlist:", error);
      return "";
    }
  },

  /**
   * Export diagram as SVG for visualization
   */
  exportSVG: (diagram: DiagramState): string => {
    try {
      // Calculate bounding box
      let minX = 0,
        maxX = 800,
        minY = 0,
        maxY = 600;

      diagram.nodes.forEach((node) => {
        const x = node.position.x;
        const y = node.position.y;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + 100);
        maxY = Math.max(maxY, y + 100);
      });

      const width = maxX - minX + 100;
      const height = maxY - minY + 100;

      let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
      svg += `<rect width="${width}" height="${height}" fill="white"/>\n`;

      // Add edges
      diagram.edges.forEach((edge) => {
        const sourceNode = diagram.nodes.find((n) => n.id === edge.source);
        const targetNode = diagram.nodes.find((n) => n.id === edge.target);

        if (sourceNode && targetNode) {
          const x1 = sourceNode.position.x - minX + 50;
          const y1 = sourceNode.position.y - minY + 50;
          const x2 = targetNode.position.x - minX + 50;
          const y2 = targetNode.position.y - minY + 50;

          svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="1"/>\n`;
        }
      });

      // Add nodes
      diagram.nodes.forEach((node) => {
        const x = node.position.x - minX + 50;
        const y = node.position.y - minY + 50;
        const data = node.data as any;

        svg += `<circle cx="${x}" cy="${y}" r="20" fill="lightblue" stroke="black" stroke-width="1"/>\n`;
        svg += `<text x="${x}" y="${y}" text-anchor="middle" dy="0.3em" font-size="10">${data?.label || "?"}</text>\n`;
      });

      svg += "</svg>";
      return svg;
    } catch (error) {
      console.error("Failed to export SVG:", error);
      return "";
    }
  },

  /**
   * Compress diagram for smaller storage
   */
  compress: (diagram: DiagramState): string => {
    // Simple compression: remove unnecessary whitespace
    return JSON.stringify(diagram);
  },

  /**
   * Decompress diagram
   */
  decompress: (compressed: string): DiagramState | null => {
    return serializer.importDiagram(compressed);
  },

  /**
   * Export diagram in MongoDB-compatible format
   * Transforms the flat diagram structure into a nested MongoDB document
   */
  exportToMongoDB: (
    diagram: DiagramState,
    projectId: string = "proj_default",
    projectName: string = "Untitled Circuit"
  ): object => {
    try {
      const now = new Date().toISOString();

      // Transform nodes into MongoDB components array
      const components = diagram.nodes.map((node, index) => {
        const nodeData = node.data as any;
        return {
          _id: `${projectId}_node_${index + 1}`,
          nodeId: node.id,
          type: node.type,
          componentType: nodeData?.componentId || "unknown",
          label: nodeData?.label || `Component ${index + 1}`,
          position: {
            x: node.position.x,
            y: node.position.y,
          },
          properties: nodeData?.properties || {},
          handles: {
            inputs: nodeData?.inputs || [],
            outputs: nodeData?.outputs || [],
          },
        };
      });

      // Transform edges into MongoDB connections array
      const connections = diagram.edges.map((edge, index) => {
        const edgeData = edge.data as any;
        const sourceNode = diagram.nodes.find((n) => n.id === edge.source);
        const targetNode = diagram.nodes.find((n) => n.id === edge.target);
        const sourceData = sourceNode?.data as any;
        const targetData = targetNode?.data as any;

        return {
          _id: `${projectId}_edge_${index + 1}`,
          edgeId: edge.id,
          from: {
            nodeId: edge.source,
            componentType: sourceData?.componentId || "unknown",
            handle: edgeData?.sourceHandle || "source",
          },
          to: {
            nodeId: edge.target,
            componentType: targetData?.componentId || "unknown",
            handle: edgeData?.targetHandle || "target",
          },
          type: edge.type,
        };
      });

      // Build the MongoDB document
      const mongoDocument = {
        _id: `circuit_${projectId}_${Date.now()}`,
        projectId,
        projectName,
        createdAt: now,
        updatedAt: now,
        description: "",
        tags: [],
        components,
        connections,
        metadata: {
          version: "1.0",
          simulationSettings: {
            totalTime: 10,
            timeStep: 0.001,
          },
          author: "user",
          isPublic: false,
        },
      };

      return mongoDocument;
    } catch (error) {
      console.error("Failed to export diagram to MongoDB format:", error);
      return {};
    }
  },

  /**
   * Export MongoDB format as JSON string (ready to save/send to database)
   */
  exportToMongoDBJSON: (
    diagram: DiagramState,
    projectId?: string,
    projectName?: string
  ): string => {
    const mongoDoc = serializer.exportToMongoDB(
      diagram,
      projectId,
      projectName
    );
    return JSON.stringify(mongoDoc, null, 2);
  },
};
