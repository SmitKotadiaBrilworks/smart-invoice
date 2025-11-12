"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import type { Workspace } from "@/types";

interface WorkspaceContextType {
  workspaces: Workspace[];
  selectedWorkspace: Workspace | null;
  setSelectedWorkspace: (workspace: Workspace | null) => void;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

const WORKSPACE_STORAGE_KEY = "selected_workspace_id";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null
  );

  // Load selected workspace from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (stored) {
        setSelectedWorkspaceId(stored);
      }
    }
  }, []);

  // Set default workspace if none selected
  useEffect(() => {
    if (
      workspaces.length > 0 &&
      !selectedWorkspaceId &&
      typeof window !== "undefined"
    ) {
      const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (stored && workspaces.find((w) => w.id === stored)) {
        setSelectedWorkspaceId(stored);
      } else {
        const firstWorkspace = workspaces[0];
        setSelectedWorkspaceId(firstWorkspace.id);
        localStorage.setItem(WORKSPACE_STORAGE_KEY, firstWorkspace.id);
      }
    }
  }, [workspaces, selectedWorkspaceId]);

  const selectedWorkspace =
    workspaces.find((w) => w.id === selectedWorkspaceId) || null;

  const handleSetSelectedWorkspace = (workspace: Workspace | null) => {
    if (workspace) {
      setSelectedWorkspaceId(workspace.id);
      if (typeof window !== "undefined") {
        localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace.id);
      }
      // Invalidate all queries that depend on workspace
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
    } else {
      setSelectedWorkspaceId(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(WORKSPACE_STORAGE_KEY);
      }
    }
  };

  const value: WorkspaceContextType = {
    workspaces,
    selectedWorkspace,
    setSelectedWorkspace: handleSetSelectedWorkspace,
    isLoading,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error(
      "useWorkspaceContext must be used within a WorkspaceProvider"
    );
  }
  return context;
}
