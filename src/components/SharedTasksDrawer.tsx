import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  UserCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ListTodo,
  Plus,
  Users,
  Check,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { SharedTaskAssignment, TaskNote, TaskCadence, TaskPriority } from '../types';
import {
  subscribeToSharedTasks,
  updateSharedTaskStatus,
} from '../services/collaborationService';

interface SharedTasksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  onAcceptTaskToBoard: (task: Partial<TaskNote>) => void;
  onOpenNewTaskModal?: (cadence: TaskCadence) => void;
}

export const SharedTasksDrawer: React.FC<SharedTasksDrawerProps> = ({
  isOpen,
  onClose,
  currentUserName,
  onAcceptTaskToBoard,
  onOpenNewTaskModal,
}) => {
  const [sharedTasks, setSharedTasks] = useState<SharedTaskAssignment[]>([]);
  const [activeTab, setActiveTab] = useState<'received' | 'assigned_by_me'>('received');

  const cleanCurrentName = currentUserName.trim() || 'Sumit';

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeToSharedTasks((tasks) => {
      setSharedTasks(tasks);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter tasks
  const receivedTasks = sharedTasks.filter(
    (t) =>
      t.assignedTo.toLowerCase() === cleanCurrentName.toLowerCase() ||
      t.assignedTo.toLowerCase() === 'all'
  );

  const assignedByMeTasks = sharedTasks.filter(
    (t) => t.assignedBy.toLowerCase() === cleanCurrentName.toLowerCase()
  );

  const pendingReceivedCount = receivedTasks.filter((t) => t.status === 'pending').length;

  const handleAcceptTask = (task: SharedTaskAssignment) => {
    onAcceptTaskToBoard({
      text: task.text,
      cadence: task.cadence,
      priority: task.priority,
      notesDetail: task.notesDetail ? `${task.notesDetail}\n\n[Assigned by ${task.assignedBy}: ${task.shareNote || ''}]` : `[Assigned by ${task.assignedBy}: ${task.shareNote || ''}]`,
      assignedBy: task.assignedBy,
      assignedTo: cleanCurrentName,
      dueDate: task.dueDate,
      shareStatus: 'accepted',
    });

    updateSharedTaskStatus(task.id, 'accepted');
  };

  const handleMarkComplete = (task: SharedTaskAssignment) => {
    updateSharedTaskStatus(task.id, 'completed');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg h-full bg-white dark:bg-[#1e1f20] border-l border-[#dadce0] dark:border-[#3c4043] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#f8f9fa] dark:bg-[#161718] border-b border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-2xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#202124] dark:text-white">
                Team Shared & Assigned Tasks
              </h3>
              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                Multi-user task sharing for <strong className="text-purple-600 dark:text-purple-400">{cleanCurrentName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#e8eaed] dark:hover:bg-[#282a2c] text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#dadce0] dark:border-[#3c4043] bg-[#f1f3f4]/50 dark:bg-[#252628] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('received')}
            className={`flex-1 py-2.5 px-4 text-xs font-bold text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'received'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-[#1e1f20]'
                : 'border-transparent text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white'
            }`}
          >
            <span>Assigned to Me</span>
            {pendingReceivedCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingReceivedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assigned_by_me')}
            className={`flex-1 py-2.5 px-4 text-xs font-bold text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'assigned_by_me'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-[#1e1f20]'
                : 'border-transparent text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white'
            }`}
          >
            <span>Assigned by Me</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-[#e8eaed] dark:bg-[#3c4043] text-[#5f6368] dark:text-[#bdc1c6]">
              {assignedByMeTasks.length}
            </span>
          </button>
        </div>

        {/* List of Tasks */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#fdfdfd] dark:bg-[#18191b]">
          {activeTab === 'received' ? (
            receivedTasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#5f6368] dark:text-[#9aa0a6]">
                <UserCheck className="w-10 h-10 text-purple-500/60 mb-2" />
                <p className="text-sm font-semibold text-[#202124] dark:text-white">
                  No assigned tasks yet
                </p>
                <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
                  When a colleague or team member assigns a task to you, it will appear here.
                </p>
              </div>
            ) : (
              receivedTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-[#252628] border border-[#dadce0] dark:border-[#3c4043] shadow-2xs hover:shadow-xs transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 flex items-center justify-center font-bold text-[10px]">
                        {t.assignedBy.charAt(0)}
                      </span>
                      <span className="text-xs font-bold text-[#202124] dark:text-white">
                        From: {t.assignedBy}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full capitalize ${
                        t.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : t.status === 'accepted'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                      }`}
                    >
                      {t.status === 'pending' ? 'Needs Action' : t.status}
                    </span>
                  </div>

                  {/* Task text */}
                  <h4 className="text-xs sm:text-sm font-bold text-[#202124] dark:text-white leading-snug">
                    {t.text}
                  </h4>

                  {/* Instruction / Note */}
                  {t.shareNote && (
                    <div className="p-2 rounded-xl bg-[#f8f9fa] dark:bg-[#1f2022] border border-[#dadce0] dark:border-[#3c4043] text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                      <strong className="text-[#3c4043] dark:text-white">Instructions:</strong> {t.shareNote}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-3 text-[10px] font-mono text-[#5f6368] dark:text-[#9aa0a6] pt-1">
                    <span className="uppercase font-bold">{t.cadence} task</span>
                    <span>•</span>
                    <span>Assigned on {t.createdAt}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#dadce0]/60 dark:border-[#3c4043]">
                    {t.status !== 'accepted' && t.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleAcceptTask(t)}
                        className="px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept & Add to Board</span>
                      </button>
                    )}

                    {t.status !== 'completed' ? (
                      <button
                        type="button"
                        onClick={() => handleMarkComplete(t)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Mark as Done</span>
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Task Completed!</span>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )
          ) : assignedByMeTasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#5f6368] dark:text-[#9aa0a6]">
              <Share2 className="w-10 h-10 text-purple-500/60 mb-2" />
              <p className="text-sm font-semibold text-[#202124] dark:text-white">
                You haven't assigned any tasks yet
              </p>
              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
                Click "Share / Assign" on any task on your board to assign it to a teammate.
              </p>
            </div>
          ) : (
            assignedByMeTasks.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#252628] border border-[#dadce0] dark:border-[#3c4043] shadow-2xs space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#202124] dark:text-white">
                      Assigned To: <strong className="text-purple-600 dark:text-purple-400">{t.assignedTo}</strong>
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full capitalize ${
                      t.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : t.status === 'accepted'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-[#202124] dark:text-white leading-snug">
                  {t.text}
                </h4>

                {t.shareNote && (
                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                    <strong>Note:</strong> {t.shareNote}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-[#5f6368] dark:text-[#9aa0a6] pt-1 border-t border-[#dadce0]/60 dark:border-[#3c4043]">
                  <span>Sent on {t.createdAt}</span>
                  <span className="font-mono uppercase font-bold text-purple-600 dark:text-purple-400">
                    {t.cadence}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
