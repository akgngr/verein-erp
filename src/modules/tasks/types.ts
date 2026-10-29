import type { TaskPriorityValue, TaskStatusValue } from "./constants";

export type TaskStatus = TaskStatusValue;
export type TaskPriority = TaskPriorityValue;

/** Liste ve form satırı (Prisma modelinden bağımsız, istemciye geçen veri). */
export type TasksRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null; // YYYY-MM-DD
  memberId: string | null;
  memberName: string | null;
  meetingId: string | null;
  meetingLabel: string | null;
  isOverdue: boolean;
  completedAt: Date | null;
  completedById: string | null;
  completedByLabel: string | null;
  createdById: string | null;
  createdByLabel: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskFilterKeys = "status" | "priority" | "memberId" | "mine" | "overdue";

export type MemberOption = {
  id: string;
  label: string;
};

export type MeetingOption = {
  id: string;
  label: string;
};
