import {
  MAX_PROJECT_NAME_LENGTH,
  MIN_PROJECT_NAME_LENGTH,
  MAX_CODE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_NODES,
  MAX_EDGES,
} from "../constants/config";

/**
 * Input validation utilities
 */
export const validators = {
  /**
   * Validate component ID format
   */
  isValidComponentId: (id: string): boolean => {
    return typeof id === "string" && /^[a-z0-9-]+$/.test(id) && id.length > 0;
  },

  /**
   * Validate project name
   */
  isValidProjectName: (name: string): boolean => {
    return (
      typeof name === "string" &&
      name.length >= MIN_PROJECT_NAME_LENGTH &&
      name.length <= MAX_PROJECT_NAME_LENGTH
    );
  },

  /**
   * Validate node position
   */
  isValidNodePosition: (x: number, y: number): boolean => {
    return (
      typeof x === "number" &&
      typeof y === "number" &&
      x >= -10000 &&
      x <= 10000 &&
      y >= -10000 &&
      y <= 10000
    );
  },

  /**
   * Validate node count
   */
  isValidNodeCount: (count: number): boolean => {
    return count >= 0 && count <= MAX_NODES;
  },

  /**
   * Validate edge count
   */
  isValidEdgeCount: (count: number): boolean => {
    return count >= 0 && count <= MAX_EDGES;
  },

  /**
   * Validate code length
   */
  isValidCodeLength: (code: string): boolean => {
    return typeof code === "string" && code.length <= MAX_CODE_LENGTH;
  },

  /**
   * Validate description length
   */
  isValidDescription: (description: string): boolean => {
    return (
      typeof description === "string" &&
      description.length >= 0 &&
      description.length <= MAX_DESCRIPTION_LENGTH
    );
  },

  /**
   * Validate email format
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate URL format
   */
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate node connection (check if connection is valid)
   */
  isValidConnection: (sourceNodeId: string, targetNodeId: string): boolean => {
    // Cannot connect to self
    if (sourceNodeId === targetNodeId) return false;
    // Both must be valid IDs
    return validators.isValidComponentId(sourceNodeId) &&
      validators.isValidComponentId(targetNodeId);
  },

  /**
   * Validate programming language
   */
  isValidLanguage: (language: string): boolean => {
    return ["c", "cpp", "python"].includes(language);
  },

  /**
   * Get validation error message
   */
  getErrorMessage: (field: string, value: any): string => {
    switch (field) {
      case "projectName":
        if (!value) return "Project name is required";
        if (value.length < MIN_PROJECT_NAME_LENGTH)
          return `Project name must be at least ${MIN_PROJECT_NAME_LENGTH} character`;
        if (value.length > MAX_PROJECT_NAME_LENGTH)
          return `Project name must be less than ${MAX_PROJECT_NAME_LENGTH} characters`;
        return "Invalid project name";

      case "code":
        if (value.length > MAX_CODE_LENGTH)
          return `Code must be less than ${MAX_CODE_LENGTH} characters`;
        return "Invalid code";

      case "description":
        if (value.length > MAX_DESCRIPTION_LENGTH)
          return `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`;
        return "Invalid description";

      case "nodeCount":
        if (value > MAX_NODES) return `Maximum ${MAX_NODES} components allowed`;
        return "Invalid node count";

      case "edgeCount":
        if (value > MAX_EDGES) return `Maximum ${MAX_EDGES} connections allowed`;
        return "Invalid edge count";

      case "email":
        return "Invalid email format";

      case "url":
        return "Invalid URL format";

      default:
        return "Invalid input";
    }
  },
};
