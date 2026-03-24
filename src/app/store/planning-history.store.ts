import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { schedulingAssignmentsMock } from "@/services/mocks/scheduling.mock";
import type {
  AuditEntry,
  EmployeeScheduleNotification,
  PublicationVersion,
  PublishedModuleSnapshot,
  ShiftAssignment,
  ShiftKind,
} from "@/shared/types/scheduling.types";

interface PlanningHistoryState {
  publicationVersions: PublicationVersion[];
  auditEntries: AuditEntry[];
  currentBoardSnapshot: PublishedModuleSnapshot[];
  currentPlanningShift: ShiftKind;
  currentPlanningDate: string;
  weekStartDate: string;
  planningRangeStart: string;
  planningRangeEnd: string;
  weeklyAssignments: ShiftAssignment[];
  boardResetVersion: number;
  employeeNotifications: EmployeeScheduleNotification[];
  addPublicationVersion: (version: PublicationVersion) => void;
  addAuditEntry: (entry: AuditEntry) => void;
  setCurrentBoardSnapshot: (snapshot: PublishedModuleSnapshot[]) => void;
  setPlanningDate: (date: string) => void;
  setPlanningShift: (shift: ShiftKind) => void;
  setPlanningRange: (start: string, end: string) => void;
  hydrateWeeklyAssignments: (assignments: ShiftAssignment[]) => void;
  setSliceAssignments: (date: string, shift: ShiftKind, snapshot: PublishedModuleSnapshot[]) => void;
  approvePublication: (versionId: string) => void;
  notifyEmployeesForPublication: (versionId: string) => void;
  clearHistory: () => void;
}

const initialWeekStart = getWeekStartDate("2026-03-23");

export const usePlanningHistoryStore = create<PlanningHistoryState>()(
  persist(
    (set) => ({
      publicationVersions: [],
      auditEntries: [],
      currentBoardSnapshot: [],
      currentPlanningShift: "manana",
      currentPlanningDate: initialWeekStart,
      weekStartDate: initialWeekStart,
      planningRangeStart: initialWeekStart,
      planningRangeEnd: addDays(initialWeekStart, 6),
      weeklyAssignments: schedulingAssignmentsMock,
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
        set((state) => {
          if (areSnapshotsEqual(state.currentBoardSnapshot, snapshot)) {
            return state;
          }

          return {
            currentBoardSnapshot: snapshot,
          };
        }),
      setPlanningDate: (date) =>
        set((state) => ({
          currentPlanningDate: date,
          weekStartDate: getWeekStartDate(date),
          planningRangeStart:
            date < state.planningRangeStart || date > state.planningRangeEnd ? date : state.planningRangeStart,
          planningRangeEnd:
            date < state.planningRangeStart || date > state.planningRangeEnd ? date : state.planningRangeEnd,
        })),
      setPlanningShift: (shift) =>
        set({
          currentPlanningShift: shift,
        }),
      setPlanningRange: (start, end) =>
        set((state) => ({
          planningRangeStart: start,
          planningRangeEnd: end,
          currentPlanningDate:
            state.currentPlanningDate < start || state.currentPlanningDate > end ? start : state.currentPlanningDate,
          weekStartDate: getWeekStartDate(start),
        })),
      hydrateWeeklyAssignments: (assignments) =>
        set((state) => {
          if (state.weeklyAssignments.length > 0) {
            return state;
          }

          return {
            weeklyAssignments: assignments,
          };
        }),
      setSliceAssignments: (date, shift, snapshot) =>
        set((state) => {
          const existingSlice = state.weeklyAssignments
            .filter((assignment) => assignment.date === date && assignment.shift === shift)
            .sort((left, right) => `${left.moduleId}-${left.employeeId}`.localeCompare(`${right.moduleId}-${right.employeeId}`));
          const incomingSlice = snapshot
            .flatMap((module) =>
              module.assignedEmployeeIds.map((employeeId) => ({
                moduleId: module.id,
                employeeId,
              })),
            )
            .sort((left, right) => `${left.moduleId}-${left.employeeId}`.localeCompare(`${right.moduleId}-${right.employeeId}`));

          if (areSliceAssignmentsEqual(existingSlice, incomingSlice)) {
            return state;
          }

          const preserved = state.weeklyAssignments.filter(
            (assignment) => !(assignment.date === date && assignment.shift === shift),
          );
          const timestamp = new Date().toISOString();
          const nextAssignments = snapshot.flatMap((module) =>
            module.assignedEmployeeIds.map((employeeId) => ({
              id: `asg-${date}-${shift}-${module.id}-${employeeId}`,
              employeeId,
              moduleId: module.id,
              date,
              shift,
              valid: true,
              createdAt: timestamp,
              updatedAt: timestamp,
            })),
          );

          return {
            weeklyAssignments: [...preserved, ...nextAssignments],
          };
        }),
      approvePublication: (versionId) =>
        set((state) => {
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

          if (!approvedVersion) {
            return { publicationVersions };
          }

          const nextSlice = getNextPlanningSlice(approvedVersion.plannedDate, approvedVersion.shift);
          const currentBoardSnapshot = approvedVersion.modulesSnapshot.map((module) => ({
            ...module,
            shiftLabel: getShiftLabel(nextSlice.shift),
            assignedEmployeeIds: [],
          }));

          return {
            publicationVersions,
          currentPlanningDate: nextSlice.date,
          weekStartDate: getWeekStartDate(nextSlice.date),
          currentPlanningShift: nextSlice.shift,
          planningRangeStart: nextSlice.date,
          planningRangeEnd: nextSlice.date,
          currentBoardSnapshot,
            weeklyAssignments: state.weeklyAssignments.filter(
              (assignment) =>
                !(assignment.date === approvedVersion.plannedDate && assignment.shift === approvedVersion.shift),
            ),
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
                message: `Tu asignación del ${formatPlanningDate(version.plannedDate)} para ${getShiftLabel(version.shift).toLowerCase()} ya fue aprobada.`,
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
          currentPlanningDate: initialWeekStart,
          weekStartDate: initialWeekStart,
          planningRangeStart: initialWeekStart,
          planningRangeEnd: addDays(initialWeekStart, 6),
          weeklyAssignments: schedulingAssignmentsMock,
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

function getNextPlanningSlice(date: string, shift: ShiftKind) {
  if (shift === "manana") {
    return { date, shift: "tarde" as const };
  }

  if (shift === "tarde") {
    return { date, shift: "noche" as const };
  }

  if (shift === "noche") {
    return { date, shift: "noche_larga" as const };
  }

  if (shift === "noche_larga") {
    return { date, shift: "descanso_remunerado" as const };
  }

  return {
    date: addDays(date, 1),
    shift: "manana" as const,
  };
}

function areSnapshotsEqual(left: PublishedModuleSnapshot[], right: PublishedModuleSnapshot[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((leftModule, index) => {
    const rightModule = right[index];

    return Boolean(
      rightModule &&
        leftModule.id === rightModule.id &&
        leftModule.shiftLabel === rightModule.shiftLabel &&
        leftModule.capacity === rightModule.capacity &&
        leftModule.assignedEmployeeIds.length === rightModule.assignedEmployeeIds.length &&
        leftModule.assignedEmployeeIds.every((employeeId, employeeIndex) => employeeId === rightModule.assignedEmployeeIds[employeeIndex]),
    );
  });
}

function areSliceAssignmentsEqual(
  existing: Array<{ moduleId: string; employeeId: string }>,
  incoming: Array<{ moduleId: string; employeeId: string }>,
) {
  if (existing.length !== incoming.length) {
    return false;
  }

  return existing.every(
    (item, index) => item.moduleId === incoming[index]?.moduleId && item.employeeId === incoming[index]?.employeeId,
  );
}

function addDays(date: string, days: number) {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

function getWeekStartDate(date: string) {
  const baseDate = new Date(`${date}T00:00:00`);
  const day = baseDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  baseDate.setDate(baseDate.getDate() + mondayOffset);
  return baseDate.toISOString().slice(0, 10);
}

function formatPlanningDate(date: string) {
  const value = new Date(`${date}T00:00:00`);
  return value.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function getShiftLabel(shift: ShiftKind) {
  if (shift === "manana") {
    return "Turno mañana";
  }
  if (shift === "tarde") {
    return "Turno tarde";
  }
  if (shift === "noche") {
    return "Turno noche";
  }
  if (shift === "noche_larga") {
    return "Turno noche larga";
  }
  return "Descanso remunerado";
}
