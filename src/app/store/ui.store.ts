import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  schedulingSearch: string;
  schedulingTargetFilter: string;
  toggleSidebar: () => void;
  setSchedulingSearch: (value: string) => void;
  setSchedulingTargetFilter: (value: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  schedulingSearch: "",
  schedulingTargetFilter: "all",
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSchedulingSearch: (value) => set({ schedulingSearch: value }),
  setSchedulingTargetFilter: (value) => set({ schedulingTargetFilter: value }),
}));
