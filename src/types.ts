export type TaskCadence = 'daily' | 'weekly' | 'monthly';

export type RoutineTaskType = 'fixed_daily' | 'single_day';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NoteColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange';

export type BoardStyle =
  | 'chrome_light'
  | 'corkboard'
  | 'felt'
  | 'grid'
  | 'darkwood'
  | 'chalkboard';

export type BoardViewMode = 'sheet' | 'sticky';

export type TaskHistoryAction =
  | 'created'
  | 'completed'
  | 'reopened'
  | 'carried_forward'
  | 'updated'
  | 'followup_set'
  | 'pinned'
  | 'unpinned'
  | 'marked_important'
  | 'unmarked_important'
  | 'priority_changed';

export interface TaskHistoryItem {
  id: string;
  action: TaskHistoryAction;
  timestamp: string; // e.g. "14 Sep 2026, 09:30 AM"
  description: string;
}

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskNote {
  id: string;
  text: string;
  cadence: TaskCadence;
  routineType?: RoutineTaskType; // 'fixed_daily' (daily recurring) | 'single_day' (one-time for today)
  priority?: TaskPriority; // 'low' | 'medium' | 'high' | 'urgent'
  completed: boolean;
  color: NoteColor;
  pinColor: string;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // e.g. "04:00 PM"
  followUpDate?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  scheduledDay?: number | string; // Day of month or recurring day (e.g., 10, 11, 15, 20, 22, 30, 31)
  deadlineDay?: number | string; // Target deadline day or rule (e.g., 6, 10, 20, 1, 'TUESDAY/FRIDAY')
  isImportant?: boolean; // ⭐ Star priority
  isPinned?: boolean; // 📌 Pin to top of column
  notesDetail?: string; // Extra details / remarks
  subtasks?: SubTask[]; // Mini-tasks / checklist items inside this task
  autoCarryForward?: boolean; // Auto carry forward switch
  rolloverRetentionLimit?: 'until_done' | '3_days' | '7_days';
  escalateOnRollover?: boolean;
  tags?: string[]; // Category tags
  assignedDate?: string; // YYYY-MM-DD of assignment
  createdAt: string; // e.g. "14 Sep 2026, 09:30 AM"
  completedAt?: string;
  completedDate?: string; // YYYY-MM-DD date when task was completed
  carryForwardCount?: number; // count of times carried forward
  lastCarriedDate?: string; // YYYY-MM-DD
  history?: TaskHistoryItem[];
  x: number; // percentage (0 - 85)
  y: number; // percentage (0 - 80)
  rotation: number; // degrees (-4 to 4)
  // Multi-user Collaboration & Assignment
  assignedTo?: string; // Target team member (e.g. "Rahul", "Priya")
  assignedBy?: string; // Creator / Assigner (e.g. "Sumit")
  shareNote?: string; // Assignment notes / instructions
  shareStatus?: 'pending' | 'accepted' | 'completed' | 'declined';
  sharedAt?: string; // Timestamp of assignment
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderAvatar?: string;
  text: string;
  timestamp: string;
  createdAtMs: number;
  roomId?: string; // 'team', 'dm_user1__user2', or 'grp_<groupId>'
  recipientId?: string; // target user id for private message
  recipientName?: string;
  isPrivate?: boolean;
  taskId?: string;
  taskTitle?: string;
  taskCadence?: TaskCadence;
  taskPriority?: TaskPriority;
  taskDueDate?: string;
  reaction?: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  memberNames: string[];
  color?: string;
}

export interface SharedTaskAssignment {
  id: string;
  taskId: string;
  text: string;
  notesDetail?: string;
  cadence: TaskCadence;
  priority?: TaskPriority;
  assignedBy: string;
  assignedTo: string;
  shareNote?: string;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  createdAt: string;
  assignedDate?: string;
  dueDate?: string;
  subtasks?: SubTask[];
  color?: NoteColor;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'busy' | 'away';
  avatarBg: string;
  avatarUrl?: string;
}

export type ViewFilter = 'all' | 'daily' | 'weekly' | 'monthly';
export type BoardLayout = 'free' | 'columns';

export interface NoteChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ImportantNote {
  id: string;
  title: string;
  content: string;
  checklist?: NoteChecklistItem[];
  color?: NoteColor;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackupData {
  version: number;
  exportDate: string;
  userName?: string;
  notes: TaskNote[];
  importantNotes?: ImportantNote[];
  preferences: {
    boardStyle: BoardStyle;
    layout?: BoardLayout;
    muted?: boolean;
    visibleColumns?: Record<TaskCadence, boolean>;
  };
}

