import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface NotificationToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl flex items-start gap-3 backdrop-blur-md transition-all animate-in slide-in-from-right-5 ${
            toast.type === 'success'
              ? 'bg-surface/95 border-buy/30 text-white'
              : toast.type === 'error'
              ? 'bg-surface/95 border-sell/40 text-white'
              : 'bg-surface/95 border-brand/30 text-white'
          }`}
        >
          <div className="mt-0.5">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-buy" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-sell" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-brand" />}
          </div>

          <div className="flex-1">
            <h4 className="text-xs font-bold leading-tight">{toast.title}</h4>
            <p className="text-[11px] text-textSecondary mt-0.5 leading-snug">{toast.message}</p>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-textMuted hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
