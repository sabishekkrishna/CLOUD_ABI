import { useState } from 'react';
import {
  X,
  Bell,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Package,
  Send,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AlertLog } from '../types.ts';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertLog[];
  onClearAlerts: () => Promise<void>;
}

export function AlertsModal({
  isOpen,
  onClose,
  alerts,
  onClearAlerts,
}: AlertsModalProps) {
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  if (!isOpen) return null;

  const handleClear = async () => {
    if (window.confirm('Clear all alert notification history?')) {
      setIsClearing(true);
      try {
        await onClearAlerts();
      } finally {
        setIsClearing(false);
      }
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedAlertId(expandedAlertId === id ? null : id);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-violet-600 text-white">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Telegram Notification History
              </h2>
              <p className="text-xs text-slate-500">
                Messages dispatched via @abisundar_bot
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <button
                onClick={handleClear}
                disabled={isClearing}
                className="p-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
                title="Clear alerts log"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {alerts.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Alerts Dispatched Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                When a tracked Cubelelo cube drops below your target price threshold or comes back in stock, telegram alerts from @abisundar_bot will be logged here.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const isExpanded = expandedAlertId === alert.id;
              const dateStr = new Date(alert.timestamp).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return (
                <div
                  key={alert.id}
                  className={`rounded-xl border transition-all ${
                    alert.success
                      ? 'border-slate-200 bg-white hover:border-slate-300'
                      : 'border-rose-200 bg-rose-50/50'
                  }`}
                >
                  <div
                    onClick={() => toggleExpand(alert.id)}
                    className="p-4 cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg flex-shrink-0 ${
                          alert.type === 'price_drop'
                            ? 'bg-emerald-50 text-emerald-600'
                            : alert.type === 'in_stock'
                            ? 'bg-sky-50 text-sky-600'
                            : 'bg-violet-50 text-violet-600'
                        }`}
                      >
                        {alert.type === 'price_drop' ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : alert.type === 'in_stock' ? (
                          <Package className="w-4 h-4" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {alert.productTitle}
                          </span>
                          {alert.variantTitle && alert.variantTitle !== 'Standard' && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                              {alert.variantTitle}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span>{dateStr}</span>
                          {alert.currentPrice > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-emerald-600">
                                ₹{alert.currentPrice.toLocaleString('en-IN')}
                              </span>
                              <span>(Target: ₹{alert.targetPrice.toLocaleString('en-IN')})</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {alert.success ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-100/60 px-2 py-0.5 rounded-full border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Failed
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Message Preview */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                      {alert.error && (
                        <div className="mb-2 p-2 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700">
                          <strong>Error:</strong> {alert.error}
                        </div>
                      )}
                      <div className="text-[11px] font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap">
                        {alert.messageText}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
