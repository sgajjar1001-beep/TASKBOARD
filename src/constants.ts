import { TaskCadence, NoteColor, TaskNote, TaskPriority } from './types';

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  {
    label: string;
    shortLabel: string;
    level: 1 | 2 | 3 | 4;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    dotBg: string;
  }
> = {
  urgent: {
    label: 'Urgent',
    shortLabel: 'URGENT',
    level: 4,
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-300',
    dotBg: 'bg-purple-600',
  },
  high: {
    label: 'High',
    shortLabel: 'HIGH',
    level: 3,
    badgeBg: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    badgeText: 'text-red-700',
    badgeBorder: 'border-red-300',
    dotBg: 'bg-red-500',
  },
  medium: {
    label: 'Medium',
    shortLabel: 'MED',
    level: 2,
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-300',
    dotBg: 'bg-amber-500',
  },
  low: {
    label: 'Low',
    shortLabel: 'LOW',
    level: 1,
    badgeBg: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
    badgeText: 'text-slate-600',
    badgeBorder: 'border-slate-300',
    dotBg: 'bg-slate-400',
  },
};

export const CADENCE_INFO: Record<
  TaskCadence,
  {
    label: string;
    color: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
  }
> = {
  daily: {
    label: 'Routine',
    color: '#0284c7', // sky-600
    bgClass: 'bg-sky-100 text-sky-800 border-sky-300',
    textClass: 'text-sky-800',
    borderClass: 'border-sky-300',
  },
  weekly: {
    label: 'Weekly',
    color: '#16a34a', // green-600
    bgClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-300',
  },
  monthly: {
    label: 'Monthly',
    color: '#9333ea', // purple-600
    bgClass: 'bg-purple-100 text-purple-800 border-purple-300',
    textClass: 'text-purple-800',
    borderClass: 'border-purple-300',
  },
};

export const NOTE_COLOR_MAP: Record<
  NoteColor,
  {
    name: string;
    bg: string;
    border: string;
    shadow: string;
    pinColor: string;
  }
> = {
  yellow: {
    name: 'Classic Yellow',
    bg: 'bg-amber-100/95 hover:bg-amber-100',
    border: 'border-amber-200/80',
    shadow: 'shadow-amber-900/10',
    pinColor: '#ef4444',
  },
  green: {
    name: 'Mint Green',
    bg: 'bg-emerald-100/95 hover:bg-emerald-100',
    border: 'border-emerald-200/80',
    shadow: 'shadow-emerald-900/10',
    pinColor: '#059669',
  },
  blue: {
    name: 'Sky Blue',
    bg: 'bg-sky-100/95 hover:bg-sky-100',
    border: 'border-sky-200/80',
    shadow: 'shadow-sky-900/10',
    pinColor: '#2563eb',
  },
  pink: {
    name: 'Rose Pink',
    bg: 'bg-rose-100/95 hover:bg-rose-100',
    border: 'border-rose-200/80',
    shadow: 'shadow-rose-900/10',
    pinColor: '#e11d48',
  },
  purple: {
    name: 'Lavender',
    bg: 'bg-purple-100/95 hover:bg-purple-100',
    border: 'border-purple-200/80',
    shadow: 'shadow-purple-900/10',
    pinColor: '#9333ea',
  },
  orange: {
    name: 'Peach',
    bg: 'bg-orange-100/95 hover:bg-orange-100',
    border: 'border-orange-200/80',
    shadow: 'shadow-orange-900/10',
    pinColor: '#ea580c',
  },
};

// Dynamic sample dates for demo
const now = new Date();
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const yesterdayStr = toDateStr(new Date(now.getTime() - 86400000));
const todayStr = toDateStr(now);
const tomorrowStr = toDateStr(new Date(now.getTime() + 86400000));
const nextWeekStr = toDateStr(new Date(now.getTime() + 5 * 86400000));

const getUpcomingDateForDays = (days: number[]) => {
  const current = new Date();
  const day = current.getDate();
  const year = current.getFullYear();
  const month = current.getMonth();
  const upcoming = days.find((d) => d >= day);
  if (upcoming) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(upcoming).padStart(2, '0')}`;
  }
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(days[0]).padStart(2, '0')}`;
};

const getUpcomingSaturday = () => {
  const current = new Date();
  const dayOfWeek = current.getDay(); // 0 is Sunday, 6 is Saturday
  const diff = (6 - dayOfWeek + 7) % 7 || 7;
  const nextSat = new Date(current.getTime() + diff * 86400000);
  return toDateStr(nextSat);
};

export const ROUTINE_TASKS_LIST = [
  'WHATSAPP & MAIL CHECK',
  'OUTWARD COURIER TRACKING',
  'COURIER - INWARD & OUTWARD',
  'MINUS STOCK CHECKING',
  'PURCHASE ENTRY',
  'PAYMENT VOUCHER ENTRY',
  'APRON TO LOKER',
  'APRON LIST UPDATE',
  'FILLING DOCS',
];

export const INITIAL_NOTES: TaskNote[] = [
  // Routine Tasks (Exact list from user image)
  {
    id: 'routine-1',
    text: 'WHATSAPP & MAIL CHECK',
    cadence: 'daily',
    routineType: 'fixed_daily',
    completed: false,
    color: 'blue',
    pinColor: '#0284c7',
    assignedDate: todayStr,
    dueDate: todayStr,
    x: 10,
    y: 10,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-r-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Fix daily routine task added',
      },
    ],
  },
  {
    id: 'routine-2',
    text: 'OUTWARD COURIER TRACKING',
    cadence: 'daily',
    routineType: 'fixed_daily',
    completed: false,
    color: 'blue',
    pinColor: '#0284c7',
    assignedDate: todayStr,
    dueDate: todayStr,
    x: 20,
    y: 10,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-r-2',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Fix daily routine task added',
      },
    ],
  },
  {
    id: 'routine-3',
    text: 'COURIER - INWARD & OUTWARD',
    cadence: 'daily',
    routineType: 'fixed_daily',
    completed: false,
    color: 'blue',
    pinColor: '#0284c7',
    assignedDate: todayStr,
    dueDate: todayStr,
    x: 30,
    y: 10,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-r-3',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Fix daily routine task added',
      },
    ],
  },
  {
    id: 'routine-4',
    text: 'MINUS STOCK CHECKING',
    cadence: 'daily',
    routineType: 'fixed_daily',
    completed: false,
    color: 'blue',
    pinColor: '#0284c7',
    assignedDate: todayStr,
    dueDate: todayStr,
    x: 40,
    y: 10,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-r-4',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Fix daily routine task added',
      },
    ],
  },
  {
    id: 'routine-5',
    text: 'PURCHASE ENTRY',
    cadence: 'daily',
    routineType: 'fixed_daily',
    completed: false,
    color: 'blue',
    pinColor: '#0284c7',
    assignedDate: todayStr,
    dueDate: todayStr,
    x: 50,
    y: 10,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-r-5',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Fix daily routine task added',
      },
    ],
  },
  {
    id: 'routine-6',
    text: 'PAYMENT VOUCHER ENTRY',
    cadence: 'daily',
    routineType: 'fixed_daily',
    completed: false,
    color: 'blue',
    pinColor: '#0284c7',
    assignedDate: todayStr,
    dueDate: todayStr,
    x: 60,
    y: 10,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-r-6',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Fix daily routine task added',
      },
    ],
  },
  {
    id: 'routine-7',
    text: 'APRON TO LOKER',
    cadence: 'daily',
    routineType: 'fixed_daily',
    completed: false,
    color: 'blue',
    pinColor: '#0284c7',
    assignedDate: todayStr,
    dueDate: todayStr,
    x: 70,
    y: 10,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-r-7',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Fix daily routine task added',
      },
    ],
  },
  {
    id: 'routine-8',
    text: 'APRON LIST UPDATE',
    cadence: 'daily',
    routineType: 'fixed_daily',
    completed: false,
    color: 'blue',
    pinColor: '#0284c7',
    assignedDate: todayStr,
    dueDate: todayStr,
    x: 80,
    y: 10,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-r-8',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Fix daily routine task added',
      },
    ],
  },
  {
    id: 'routine-9',
    text: 'FILLING DOCS',
    cadence: 'daily',
    routineType: 'fixed_daily',
    completed: false,
    color: 'blue',
    pinColor: '#0284c7',
    assignedDate: todayStr,
    dueDate: todayStr,
    x: 90,
    y: 10,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-r-9',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Fix daily routine task added',
      },
    ],
  },

  // Weekly Tasks (from User's Schedule Sheet)
  {
    id: 'task-w-inout',
    text: 'IN OUT REGISTER LAYOUT',
    cadence: 'weekly',
    priority: 'high',
    scheduledDay: '10, 21, 29',
    dueDate: getUpcomingDateForDays([10, 21, 29]),
    completed: false,
    color: 'green',
    pinColor: '#059669',
    notesDetail: 'Recurring Dates: 10, 21, 29',
    assignedDate: todayStr,
    x: 14,
    y: 15,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-winout-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 10, 21, 29',
      },
    ],
  },
  {
    id: 'task-w-bmr-entry',
    text: 'REQUISITION & BMR-BPR ENTRY',
    cadence: 'weekly',
    priority: 'high',
    scheduledDay: '10, 21, 29',
    dueDate: getUpcomingDateForDays([10, 21, 29]),
    completed: false,
    color: 'green',
    pinColor: '#059669',
    notesDetail: 'Recurring Dates: 10, 21, 29',
    assignedDate: todayStr,
    x: 44,
    y: 15,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-wbmr-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 10, 21, 29',
      },
    ],
  },
  {
    id: 'task-w-petty-cash',
    text: 'PETTY CASH COUTING',
    cadence: 'weekly',
    priority: 'high',
    scheduledDay: '10, 21, 29',
    dueDate: getUpcomingDateForDays([10, 21, 29]),
    completed: false,
    color: 'green',
    pinColor: '#059669',
    notesDetail: 'Recurring Dates: 10, 21, 29',
    assignedDate: todayStr,
    x: 74,
    y: 15,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-wcash-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 10, 21, 29',
      },
    ],
  },
  {
    id: 'task-w-employee-files',
    text: 'EMPLOYEE FILES ARRANGE',
    cadence: 'weekly',
    priority: 'medium',
    scheduledDay: '15, 30',
    dueDate: getUpcomingDateForDays([15, 30]),
    completed: false,
    color: 'green',
    pinColor: '#059669',
    notesDetail: 'Recurring Dates: 15, 30',
    assignedDate: todayStr,
    x: 14,
    y: 35,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-wfiles-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 15, 30',
      },
    ],
  },
  {
    id: 'task-w-apron-list',
    text: 'APRON LIST UPDATE',
    cadence: 'weekly',
    priority: 'medium',
    scheduledDay: 'Sat',
    dueDate: getUpcomingSaturday(),
    completed: false,
    color: 'green',
    pinColor: '#059669',
    notesDetail: 'Recurring Day: Sat',
    assignedDate: todayStr,
    x: 44,
    y: 35,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-wapron-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled EVERY SATURDAY',
      },
    ],
  },

  // Monthly Tasks (from User's Schedule Sheet)
  {
    id: 'task-m-1',
    text: 'GSTR-2B RECO',
    cadence: 'monthly',
    priority: 'high',
    scheduledDay: 15,
    deadlineDay: 20,
    dueDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-20`,
    completed: false,
    color: 'purple',
    pinColor: '#9333ea',
    isImportant: true,
    notesDetail: 'Schedule Date: 15 | Deadline Date: 20',
    assignedDate: todayStr,
    x: 15,
    y: 15,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-m1-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 15th, Deadline on 20th',
      },
    ],
  },
  {
    id: 'task-m-2',
    text: 'MOOWR RETURN SHEET',
    cadence: 'monthly',
    priority: 'medium',
    scheduledDay: 10,
    deadlineDay: 10,
    dueDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`,
    completed: false,
    color: 'purple',
    pinColor: '#9333ea',
    notesDetail: 'Schedule Date: 10 | Deadline Date: 10',
    assignedDate: todayStr,
    x: 45,
    y: 15,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-m2-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 10th, Deadline on 10th',
      },
    ],
  },
  {
    id: 'task-m-3',
    text: 'DCB BANK-RAJKOT STOCK STATEMENT',
    cadence: 'monthly',
    priority: 'medium',
    scheduledDay: 10,
    deadlineDay: 10,
    dueDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`,
    completed: false,
    color: 'purple',
    pinColor: '#9333ea',
    notesDetail: 'Schedule Date: 10 | Deadline Date: 10',
    assignedDate: todayStr,
    x: 75,
    y: 15,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-m3-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 10th, Deadline on 10th',
      },
    ],
  },
  {
    id: 'task-m-4',
    text: 'TDS PAYMENT',
    cadence: 'monthly',
    priority: 'high',
    scheduledDay: 6,
    deadlineDay: 6,
    dueDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-06`,
    completed: false,
    color: 'purple',
    pinColor: '#9333ea',
    isImportant: true,
    notesDetail: 'Schedule Date: 6 | Deadline Date: 6',
    assignedDate: todayStr,
    x: 15,
    y: 30,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-m4-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 6th, Deadline on 6th',
      },
    ],
  },
  {
    id: 'task-m-5',
    text: 'TDS SHEET READY',
    cadence: 'monthly',
    priority: 'high',
    scheduledDay: 5,
    deadlineDay: 6,
    dueDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-06`,
    completed: false,
    color: 'purple',
    pinColor: '#9333ea',
    notesDetail: 'Schedule Date: 5 | Deadline Date: 6',
    assignedDate: todayStr,
    x: 45,
    y: 30,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-m5-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 5th, Deadline on 6th',
      },
    ],
  },
  {
    id: 'task-m-6',
    text: 'ATTENDENCE SHEET NEXT MONTH',
    cadence: 'monthly',
    priority: 'medium',
    scheduledDay: 31,
    deadlineDay: 1,
    dueDate: `${now.getFullYear()}-${String(now.getMonth() + 1 === 12 ? 1 : now.getMonth() + 2).padStart(2, '0')}-01`,
    completed: false,
    color: 'purple',
    pinColor: '#9333ea',
    notesDetail: 'Schedule Date: 31 | Deadline Date: 1',
    assignedDate: todayStr,
    x: 75,
    y: 30,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-m6-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 31st, Deadline on 1st',
      },
    ],
  },
  {
    id: 'task-m-7',
    text: 'OT SHEET PREVIUS MONTH',
    cadence: 'monthly',
    priority: 'medium',
    scheduledDay: 5,
    deadlineDay: 5,
    dueDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`,
    completed: false,
    color: 'purple',
    pinColor: '#9333ea',
    notesDetail: 'Schedule Date: 5 | Deadline Date: 5',
    assignedDate: todayStr,
    x: 15,
    y: 45,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-m7-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 5th, Deadline on 5th',
      },
    ],
  },
  {
    id: 'task-m-8',
    text: 'STATIONERY AUDIT & PO',
    cadence: 'monthly',
    priority: 'low',
    scheduledDay: 26,
    dueDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-26`,
    completed: false,
    color: 'purple',
    pinColor: '#9333ea',
    notesDetail: 'Schedule Date: 26',
    assignedDate: todayStr,
    x: 45,
    y: 45,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-m8-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 26th',
      },
    ],
  },
  {
    id: 'task-m-9',
    text: 'PT RECEIPT COLLECTION AT PANCHAYAT',
    cadence: 'monthly',
    priority: 'low',
    scheduledDay: 12,
    deadlineDay: 'TUESDAY/FRIDAY',
    completed: false,
    color: 'purple',
    pinColor: '#9333ea',
    notesDetail: 'Schedule Date: 12 | Deadline Date: TUESDAY/FRIDAY',
    assignedDate: todayStr,
    x: 75,
    y: 45,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-m9-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 12th, Deadline: Tuesday/Friday',
      },
    ],
  },
  {
    id: 'task-m-10',
    text: 'MEDICLAIM MAIL',
    cadence: 'monthly',
    priority: 'medium',
    scheduledDay: 6,
    deadlineDay: 11,
    dueDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-11`,
    completed: false,
    color: 'purple',
    pinColor: '#9333ea',
    notesDetail: 'Schedule Date: 6 | Deadline Date: 11',
    assignedDate: todayStr,
    x: 15,
    y: 60,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-m10-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 6th, Deadline on 11th',
      },
    ],
  },
  {
    id: 'task-m-11',
    text: 'MANJULA PRINTER METER READING SEND',
    cadence: 'monthly',
    priority: 'low',
    scheduledDay: 26,
    dueDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-26`,
    completed: false,
    color: 'purple',
    pinColor: '#9333ea',
    notesDetail: 'Schedule Date: 26',
    assignedDate: todayStr,
    x: 45,
    y: 60,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-m11-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 26th',
      },
    ],
  },
  {
    id: 'task-m-12',
    text: 'WATER TANKER (NITINBHAI)EXP',
    cadence: 'monthly',
    priority: 'low',
    scheduledDay: 31,
    deadlineDay: 1,
    dueDate: `${now.getFullYear()}-${String(now.getMonth() + 1 === 12 ? 1 : now.getMonth() + 2).padStart(2, '0')}-01`,
    completed: false,
    color: 'purple',
    pinColor: '#9333ea',
    notesDetail: 'Schedule Date: 31 | Deadline Date: 1',
    assignedDate: todayStr,
    x: 75,
    y: 60,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-m12-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 31st, Deadline on 1st',
      },
    ],
  },
  {
    id: 'task-m-13',
    text: 'MANJULA PRINTER METER READING ON 25 OF EVERY MONTH',
    cadence: 'monthly',
    priority: 'medium',
    scheduledDay: 25,
    deadlineDay: 25,
    dueDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-25`,
    completed: false,
    color: 'purple',
    pinColor: '#9333ea',
    notesDetail: 'Meter reading on 25 of every month',
    assignedDate: todayStr,
    x: 45,
    y: 75,
    rotation: 0,
    createdAt: `${todayStr}, 09:00 AM`,
    history: [
      {
        id: 'h-m13-1',
        action: 'created',
        timestamp: `${todayStr}, 09:00 AM`,
        description: 'Scheduled for 25th of every month',
      },
    ],
  },
];
