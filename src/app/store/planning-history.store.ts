import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  AuditEntry,
  EmployeeScheduleNotification,
  PublicationVersion,
  PublishedModuleSnapshot,
  ShiftKind,
} from "@/shared/types/scheduling.types";

interface PlanningHistoryState {
  publicationVersions: PublicationVersion[];
  auditEntries: AuditEntry[];
  currentBoardSnapshot: PublishedModuleSnapshot[];
  currentPlanningShift: ShiftKind;
  boardResetVersion: number;
  employeeNotifications: EmployeeScheduleNotification[];
  addPublicationVersion: (version: PublicationVersion) => void;
  addAuditEntry: (entry: AuditEntry) => void;
  setCurrentBoardSnapshot: (snapshot: PublishedModuleSnapshot[]) => void;
  approvePublication: (versionId: string) => void;
  notifyEmployeesForPublication: (versionId: string) => void;
  clearHistory: () => void;
}

export const usePlanningHistoryStore = create<PlanningHistoryState>()(
  persist(
    (set) => ({
      publicationVersions: [],
      auditEntries: [],
      currentBoardSnapshot: [],
      currentPlanningShift: "manana",
      boardResetVersion: 0,
      employeeNotifications: [],
      addPublicationVersion: (version) =>
        set((state) => ({
          publicationVersions: [version, ...state.publicationVersions].slice(0, 20),
        })),
      addAuditEntry: (entry) =>
        set((state) => ({
          auditEntries: [entry, ...state.auditEntries].slice(0, 50),
        })),
      setCurrentBoardSnapshot: (snapshot) =>
        set({
          currentBoardSnapshot: snapshot,
        }),
      approvePublication: (versionId) =>
        set((state) => {
          const nextShift = getNextShift(state.currentPlanningShift);
          const approvedAt = new Date().toISOString();
          const publicationVersions = state.publicationVersions.map((version) =>
            version.id === versionId
              ? {
                  ...version,
                  status: "aprobada" as const,
                  approvedAt,
                }
              : version,
          );
          const approvedVersion = publicationVersions.find((version) => version.id === versionId);

          return {
            publicationVersions,
            currentPlanningShift: nextShift,
            currentBoardSnapshot: approvedVersion
              ? approvedVersion.modulesSnapshot.map((module) => ({
                  ...module,
                  shiftLabel: getShiftLabel(nextShift),
                  assignedEmployeeIds: [],
                }))
              : state.currentBoardSnapshot,
            boardResetVersion: state.boardResetVersion + 1,
          };
        }),
      notifyEmployeesForPublication: (versionId) =>
        set((state) => {
          const version = state.publicationVersions.find((item) => item.id === versionId);

          if (!version) {
            return state;
          }

          const employeeIds = Array.from(
            new Set(version.modulesSnapshot.flatMap((module) => module.assignedEmployeeIds)),
          );
          const timestamp = new Date().toISOString();

          return {
            publicationVersions: state.publicationVersions.map((item) =>
              item.id === versionId
                ? {
                    ...item,
                    notifiedEmployeeIds: employeeIds,
                  }
                : item,
            ),
            employeeNotifications: [
              ...employeeIds.map((employeeId, index) => ({
                id: `notification-${versionId}-${employeeId}-${index}`,
                employeeId,
                publicationVersionId: versionId,
                title: `Turno ${getShiftLabel(version.shift)} publicado`,
                message: `Tu asignación del turno ${getShiftLabel(version.shift).toLowerCase()} ya fue aprobada y publicada.`,
                shift: version.shift,
                read: false,
                createdAt: timestamp,
                updatedAt: timestamp,
              })),
              ...state.employeeNotifications,
            ].slice(0, 100),
          };
        }),
      clearHistory: () =>
        set({
          publicationVersions: [],
          auditEntries: [],
          currentBoardSnapshot: [],
          currentPlanningShift: "manana",
          boardResetVersion: 0,
          employeeNotifications: [],
        }),
    }),
    {
      name: "planning-history",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

function getNextShift(shift: ShiftKind): ShiftKind {
  if (shift === "manana") {
    return "tarde";
  }
  if (shift === "tarde") {
    return "noche";
  }
  return "manana";
}

function getShiftLabel(shift: ShiftKind) {
  if (shift === "manana") {
    return "Turno mañana";
  }
  if (shift === "tarde") {
    return "Turno tarde";
  }
  return "Turno noche";
}
