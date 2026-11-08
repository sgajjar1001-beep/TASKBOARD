import React from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Clock,
  CheckCircle2,
  X,
  Volume2,
  Calendar,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { TaskNote } from '../types';

interface TaskReminderAlertModalProps {
  task: TaskNote | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleteTask: (taskId: string) => void;
  onSnoozeTask?: (taskId: string, minutes: number) => void;
  onOpenTaskDetails?: (task: TaskNote) => void;
  permissionStatus: 'default' | 'granted' | 'denied' | 'unsupported';
  onRequestPermission: () => void;
}

export const TaskReminderAlertModal: React.FC<TaskReminderAlertModalProps> = ({
  task,
  isOpen,
  onClose,
  onCompleteTask,
  onSnoozeTask,
  onOpenTaskDetails,
  permissionStatus,
  onRequestPermission,
}) => {
  if (!isOpen || !task) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#202124] rounded-3xl shadow-2xl border-2 border-amber-400 dark:border-amber-600 overflow-hidden animate-in zoom-in-95 duration-150 text-[#202124] dark:text-[#e8eaed]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glowing Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xs animate-bounce">
              <Bell className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full">
                Task Reminder Alert ⏰
              </span>
              <h3 className="text-base font-extrabold leading-snug mt-0.5">
                Time for your Task!
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission Request Prompt if not yet granted */}
        {permissionStatus === 'default' && (
          <div className="px-5 py-2.5 bg-blue-50 dark:bg-blue-950/60 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm">🔔</span>
              <span className="text-[#1a73e8] dark:text-[#8ab4f8] font-medium leading-tight">
                Allow mobile & PC system notifications?
              </span>
            </div>
            <button
              type="button"
              onClick={onRequestPermission}
              className="px-2.5 py-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-[11px] font-bold rounded-lg shrink-0 cursor-pointer shadow-2xs"
            >
              Allow
            </button>
          </div>
        )}

        {/* Task Content Card */}
        <div className="p-5 space-y-4">
          <div className="p-4 rounded-2xl bg-[#f8f9fa] dark:bg-[#2c2d30] border border-[#dadce0] dark:border-[#3c4043] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-[#1a73e8] dark:text-[#8ab4f8] border border-blue-200 dark:border-blue-800">
                {task.cadence || 'daily'} task
              </span>
              {task.dueTime && (
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{task.dueTime}</span>
                </span>
              )}
            </div>

            <h4
              onClick={() => {
                onClose();
                onOpenTaskDetails?.(task);
              }}
              className="text-base sm:text-lg font-bold text-[#202124] dark:text-[#f1f3f4] leading-snug cursor-pointer hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors"
            >
              {task.text}
            </h4>

            {task.notesDetail && (
              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] line-clamp-2 leading-relaxed">
                {task.notesDetail}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {/* Mark Done */}
            <button
              type="button"
              onClick={() => {
                onCompleteTask(task.id);
                onClose();
              }}
              className="col-span-2 py-2.5 px-4 rounded-xl bg-[#188038] hover:bg-[#137333] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Mark as Completed</span>
            </button>

            {/* Snooze 5 Min */}
            <button
              type="button"
              onClick={() => {
                onSnoozeTask?.(task.id, 5);
                onClose();
              }}
              className="py-2 px-3 rounded-xl bg-white dark:bg-[#2c2d30] hover:bg-slate-100 dark:hover:bg-[#35363a] border border-[#dadce0] dark:border-[#3c4043] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Snooze 5 Min</span>
            </button>

            {/* View Full Task */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTaskDetails?.(task);
              }}
              className="py-2 px-3 rounded-xl bg-white dark:bg-[#2c2d30] hover:bg-slate-100 dark:hover:bg-[#35363a] border border-[#dadce0] dark:border-[#3c4043] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-[#1a73e8] dark:text-[#8ab4f8]"
            >
              <span>View Task</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
