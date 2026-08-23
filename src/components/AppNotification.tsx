import React from 'react';
import { CheckCircle2, Info, Sparkles, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AppNotification: React.FC = () => {
  const { notification, clearNotification } = useApp();

  if (!notification) return null;

  const Icon = notification.type === 'xp'
    ? Sparkles
    : notification.type === 'success'
      ? CheckCircle2
      : Info;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-20 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-xl shadow-blue-900/10 dark:border-blue-800 dark:bg-slate-900 dark:text-slate-100"
    >
      <Icon className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
      <span>{notification.message}</span>
      <button
        data-ux-flow="app.notification"
        type="button"
        onClick={clearNotification}
        aria-label="Đóng thông báo"
        className="ml-1 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};
