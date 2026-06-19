import { RepairStatus } from "@/lib/types";

export type KanbanColumn = {
  id: string;
  label: string;
  color: string;
  statuses: RepairStatus[];
  dropStatus: RepairStatus;
};

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "received", label: "Received", color: "bg-blue-500", statuses: ["DEVICE_RECEIVED"], dropStatus: "DEVICE_RECEIVED" },
  { id: "diagnosis", label: "Diagnosis", color: "bg-cyan-500", statuses: ["UNDER_DIAGNOSIS", "WAITING_FOR_APPROVAL"], dropStatus: "UNDER_DIAGNOSIS" },
  { id: "parts", label: "Waiting Parts", color: "bg-amber-500", statuses: ["WAITING_FOR_PARTS"], dropStatus: "WAITING_FOR_PARTS" },
  { id: "repair", label: "Repair", color: "bg-violet-500", statuses: ["REPAIR_IN_PROGRESS"], dropStatus: "REPAIR_IN_PROGRESS" },
  { id: "qc", label: "Quality Check", color: "bg-indigo-500", statuses: ["QUALITY_CHECK"], dropStatus: "QUALITY_CHECK" },
  { id: "ready", label: "Ready", color: "bg-emerald-500", statuses: ["READY_FOR_PICKUP"], dropStatus: "READY_FOR_PICKUP" },
];

export function columnForStatus(status: RepairStatus): KanbanColumn | undefined {
  return KANBAN_COLUMNS.find((c) => c.statuses.includes(status));
}
