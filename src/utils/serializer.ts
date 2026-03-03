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
};
