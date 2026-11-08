/**
 * Helper utilities for task deadlines, followups, history timestamps, and carry-forward checks
 */

export function getTodayString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
}

export function getTomorrowString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
}

export function formatCurrentTimestamp(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dateStr}, ${timeStr}`;
}

export function isDateOverdue(dueDateStr?: string): boolean {
  if (!dueDateStr) return false;
  const todayStr = getTodayString();
  return dueDateStr < todayStr;
}

export function formatDueDate(dueDateStr: string): {
  label: string;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
} {
  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();
  const isOverdue = dueDateStr < todayStr;
  const isToday = dueDateStr === todayStr;
  const isTomorrow = dueDateStr === tomorrowStr;

  const [year, month, day] = dueDateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  let label = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (isToday) {
    label = 'Today';
  } else if (isTomorrow) {
    label = 'Tomorrow';
  }

  return { label, isOverdue, isToday, isTomorrow };
}

export function formatFollowUp(followUpStr?: string): {
  label: string;
  isOverdue: boolean;
  isToday: boolean;
} | null {
  if (!followUpStr) return null;
  const todayStr = getTodayString();

  // Might be YYYY-MM-DD or YYYY-MM-DDTHH:mm
  const isDateTime = followUpStr.includes('T');
  const datePart = isDateTime ? followUpStr.split('T')[0] : followUpStr;
  const timePart = isDateTime ? followUpStr.split('T')[1] : null;

  const isToday = datePart === todayStr;
  const isOverdue = datePart < todayStr;

  const [year, month, day] = datePart.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  let label = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (isToday) label = 'Today';
  else if (datePart === getTomorrowString()) label = 'Tomorrow';

  if (timePart) {
    const [h, m] = timePart.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    label += ` ${formattedHour}:${m} ${ampm}`;
  }

  return { label, isOverdue, isToday };
}

/**
 * Check if a daily task is from a previous day and still pending (ready to carry forward)
 */
export function isTaskPendingFromPreviousDay(task: {
  cadence: string;
  completed: boolean;
  assignedDate?: string;
  lastCarriedDate?: string;
}): boolean {
  if (task.completed) return false;
  if (task.cadence !== 'daily') return false;

  const todayStr = getTodayString();
  const effectiveDate = task.lastCarriedDate || task.assignedDate;
  if (!effectiveDate) return false;

  return effectiveDate < todayStr;
}

/**
 * Check if a task belongs to today's date (Routine daily tasks, tasks due/assigned today,
 * or recurring tasks scheduled for today's date/day).
 */
export function isTaskForToday(task: {
  cadence?: string;
  completed?: boolean;
  completedDate?: string;
  dueDate?: string;
  assignedDate?: string;
  lastCarriedDate?: string;
  scheduledDay?: number | string;
  deadlineDay?: number | string;
  createdAt?: string;
}): boolean {
  if (!task) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday

  // If task is completed:
  if (task.completed) {
    // Count as today's completed task if completed today
    if (task.completedDate === todayStr) {
      return true;
    }
    // Fallback if completed today without separate completedDate
    if (!task.completedDate && (task.assignedDate === todayStr || task.cadence === 'daily')) {
      return true;
    }
    return false;
  }

  // Active (uncompleted) tasks:
  // 1. ALL daily routine tasks belong to today (they repeat daily for today)
  if (task.cadence === 'daily') {
    return true;
  }

  // 2. Explicit dueDate matches today
  if (task.dueDate && task.dueDate === todayStr) {
    return true;
  }

  // 3. Overdue / carried-over tasks from previous dates (to be done today)
  if (task.dueDate && task.dueDate < todayStr) {
    return true;
  }

  // 4. Assigned or carried forward today
  if (task.assignedDate === todayStr || task.lastCarriedDate === todayStr) {
    return true;
  }

  // 5. Day of month matches today (e.g. today is 19th)
  if (typeof task.scheduledDay === 'number' && task.scheduledDay === currentDay) {
    return true;
  }
  if (typeof task.deadlineDay === 'number' && task.deadlineDay === currentDay) {
    return true;
  }

  // 6. String scheduledDay rules (e.g. "19", "10, 19, 29", or weekday like "MONDAY")
  if (typeof task.scheduledDay === 'string') {
    const matches = task.scheduledDay.match(/\b\d{1,2}\b/g);
    if (matches && matches.length > 0) {
      const days = matches.map(Number).filter((n) => n >= 1 && n <= 31);
      if (days.includes(currentDay)) {
        return true;
      }
    }

    const upper = task.scheduledDay.toUpperCase();
    const parts = upper.split(',').map((p) => p.trim());
    if ((parts.includes('MONDAY') || parts.includes('MON') || parts.includes('M')) && dayOfWeek === 1) return true;
    if ((parts.includes('TUESDAY') || parts.includes('TUE') || parts.includes('T')) && dayOfWeek === 2) return true;
    if ((parts.includes('WEDNESDAY') || parts.includes('WED') || parts.includes('W')) && dayOfWeek === 3) return true;
    if ((parts.includes('THURSDAY') || parts.includes('THU') || parts.includes('TH')) && dayOfWeek === 4) return true;
    if ((parts.includes('FRIDAY') || parts.includes('FRI') || parts.includes('F')) && dayOfWeek === 5) return true;
    if ((parts.includes('SATURDAY') || parts.includes('SAT') || parts.includes('SA') || parts.includes('S')) && dayOfWeek === 6) return true;
    if ((parts.includes('SUNDAY') || parts.includes('SUN') || parts.includes('SU')) && dayOfWeek === 0) return true;
  }

  // 7. General tasks without a future due date
  if (!task.dueDate || task.dueDate <= todayStr) {
    if (task.cadence !== 'weekly' && task.cadence !== 'monthly') {
      return true;
    }
  }

  return false;
}

/**
 * Minimal short date or day indicator for task rows/cards
 * As requested:
 * - In monthly tasks: write ONLY the date (e.g. "15", "10", "10, 21, 29")
 * - In weekly tasks: write ONLY the date if date-based (e.g. "10, 21, 29", "15, 30", "24")
 * - For weekdays: do NOT write full "Monday" or "Every Saturday", write in short ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")!
 */
export function formatMinimalDateOrDay(note: {
  dueDate?: string;
  scheduledDay?: number | string;
  cadence?: string;
}): string | null {
  const shortDayMap: Record<string, string> = {
    MONDAY: 'Mon', MON: 'Mon', M: 'Mon',
    TUESDAY: 'Tue', TUE: 'Tue', T: 'Tue',
    WEDNESDAY: 'Wed', WED: 'Wed', W: 'Wed',
    THURSDAY: 'Thu', THU: 'Thu', TH: 'Thu',
    FRIDAY: 'Fri', FRI: 'Fri', F: 'Fri',
    SATURDAY: 'Sat', SAT: 'Sat', SA: 'Sat', S: 'Sat', 'EVERY SATURDAY': 'Sat',
    SUNDAY: 'Sun', SUN: 'Sun', SU: 'Sun', 'EVERY SUNDAY': 'Sun',
  };

  // 1. If scheduledDay is set (number or string)
  if (note.scheduledDay !== undefined && note.scheduledDay !== '') {
    if (typeof note.scheduledDay === 'number') {
      return `${note.scheduledDay}`;
    }

    const raw = String(note.scheduledDay).trim();

    // Check if it's a recurring pattern with dates like "10, 21, 29 DATE OF EVERY MONTH" or "15, 30 DATE OF EVERY MONTH"
    const dateNumMatches = raw.match(/\b\d{1,2}\b/g);
    if (/DATE\s+OF\s+EVERY\s+MONTH/i.test(raw) || /^[\d\s,]+$/.test(raw)) {
      if (dateNumMatches && dateNumMatches.length > 0) {
        // Return only the dates e.g. "10, 21, 29" or "15, 30"
        return dateNumMatches.join(', ');
      }
    }

    // Check if it contains YYYY-MM-DD date strings (e.g., "2026-10-24" or "2026-10-24, 2026-10-26")
    const ymdMatches = raw.match(/\d{4}-\d{2}-(\d{2})/g);
    if (ymdMatches && ymdMatches.length > 0) {
      const dayNums = ymdMatches.map((ymd) => {
        const parts = ymd.split('-');
        return String(parseInt(parts[2], 10));
      });
      return dayNums.join(', ');
    }

    // Check if it's a weekday string like "EVERY SATURDAY", "MONDAY", "Friday", "Mon, Fri"
    const cleanedRaw = raw.replace(/^EVERY\s+/i, '').trim();
    if (shortDayMap[cleanedRaw.toUpperCase()]) {
      return shortDayMap[cleanedRaw.toUpperCase()];
    }

    if (raw.includes(',')) {
      const parts = raw.split(',').map((p) => p.trim());
      const shortParts = parts.map((p) => {
        const c = p.replace(/^EVERY\s+/i, '').trim().toUpperCase();
        return shortDayMap[c] || p;
      });
      return shortParts.join(', ');
    }

    if (shortDayMap[raw.toUpperCase()]) {
      return shortDayMap[raw.toUpperCase()];
    }

    // If pure number string like "10"
    if (/^\d+$/.test(raw)) {
      return raw;
    }

    // If it has date numbers inside and no long words
    if (dateNumMatches && dateNumMatches.length > 0 && !/[a-zA-Z]{4,}/.test(raw)) {
      return dateNumMatches.join(', ');
    }

    return raw;
  }

  // 2. If dueDate is set
  if (note.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(note.dueDate)) {
    const [y, m, d] = note.dueDate.split('-').map(Number);
    // If weekly or monthly: return clean date
    return `${d}`;
  }

  return null;
}


