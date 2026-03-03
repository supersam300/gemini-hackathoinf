import { useEffect, useRef } from "react";
import { useProjectStore } from "../store/projectStore";
import { useEditorStore } from "../store/editorStore";
import { AUTO_SAVE_INTERVAL } from "../constants/config";
import { storage } from "../utils/storage";

/**
 * Custom hook for auto-saving projects and code
 *
 * Automatically saves the current project and code to localStorage
 * at specified intervals when changes are detected
 */
export const useAutoSave = (enabled = true) => {
  const { currentProject, isSaved, setIsSaved } = useProjectStore();
  const { code } = useEditorStore();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSaveRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled || isSaved) return;

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set up auto-save timer
    saveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [enabled, isSaved, currentProject, code]);

  /**
   * Perform the actual auto-save
   */
  const performAutoSave = () => {
    try {
      // Save project if exists
      if (currentProject) {
        // Update project with latest code
        const updatedProject = {
          ...currentProject,
          code,
          updatedAt: Date.now(),
        };

        storage.saveProject(updatedProject);
        storage.saveRecentProject(updatedProject.id);
        setIsSaved(true);
        lastSaveRef.current = Date.now();

        console.log("Auto-saved at", new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  /**
   * Manually trigger a save
   */
  const manualSave = () => {
    performAutoSave();
  };

  /**
   * Get last save time
   */
  const getLastSaveTime = () => lastSaveRef.current;

  return {
    manualSave,
    getLastSaveTime,
  };
};
