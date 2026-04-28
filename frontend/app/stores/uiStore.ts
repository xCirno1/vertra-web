import { create } from 'zustand';
import { SelectionMode } from '@/types/scene';

interface UIState {
  // Panel states
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  bottomPanelOpen: boolean;
  texturePanelOpen: boolean;
  bottomPanelHeight: number;
  sidebarWidth: number;
  inspectorWidth: number;

  // Tool state
  activeTool: SelectionMode;
  viewMode: 'solid' | 'wireframe' | 'shaded';

  // Modal/dialog states
  isExporting: boolean;
  exportFormat: 'json' | 'png' | 'gltf';

  // Actions
  toggleSidebar: () => void;
  toggleInspector: () => void;
  toggleBottomPanel: () => void;
  toggleTexturePanel: () => void;
  setBottomPanelHeight: (height: number) => void;
  setSidebarWidth: (width: number) => void;
  setInspectorWidth: (width: number) => void;
  setActiveTool: (tool: SelectionMode) => void;
  setViewMode: (mode: 'solid' | 'wireframe' | 'shaded') => void;
  setIsExporting: (isExporting: boolean) => void;
  setExportFormat: (format: 'json' | 'png' | 'gltf') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  inspectorOpen: true,
  bottomPanelOpen: true,
  texturePanelOpen: true,
  bottomPanelHeight: 180,
  sidebarWidth: 280,
  inspectorWidth: 320,

  activeTool: 'none',
  viewMode: 'solid',

  isExporting: false,
  exportFormat: 'json',

  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    })),

  toggleInspector: () =>
    set((state) => ({
      inspectorOpen: !state.inspectorOpen,
    })),

  toggleBottomPanel: () =>
    set((state) => ({
      bottomPanelOpen: !state.bottomPanelOpen,
    })),

  toggleTexturePanel: () =>
    set((state) => ({
      texturePanelOpen: !state.texturePanelOpen,
    })),

  setBottomPanelHeight: (height: number) =>
    set(() => ({
      bottomPanelHeight: Math.max(100, Math.min(height, 600)),
    })),

  setSidebarWidth: (width: number) =>
    set(() => ({
      sidebarWidth: Math.max(180, Math.min(width, 500)),
    })),

  setInspectorWidth: (width: number) =>
    set(() => ({
      inspectorWidth: Math.max(200, Math.min(width, 600)),
    })),

  setActiveTool: (tool: SelectionMode) =>
    set(() => ({
      activeTool: tool,
    })),

  setViewMode: (mode: 'solid' | 'wireframe' | 'shaded') =>
    set(() => ({
      viewMode: mode,
    })),

  setIsExporting: (isExporting: boolean) =>
    set(() => ({
      isExporting,
    })),

  setExportFormat: (format: 'json' | 'png' | 'gltf') =>
    set(() => ({
      exportFormat: format,
    })),
}));
