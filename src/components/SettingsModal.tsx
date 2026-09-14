import { useState, useEffect, type FormEvent } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Clock,
  Shield,
  Loader2,
  Key,
  MessageSquare,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { TrackerSettings } from '../types.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TrackerSettings;
  onSaveSettings: (updates: Partial<TrackerSettings>) => Promise<void>;
  onSendTestMessage: (token?: string, chatId?: string) => Promise<{ success: boolean; error?: string }>;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onSendTestMessage,
}: SettingsModalProps) {
  const [token, setToken] = useState(settings.telegramToken || '');
  const [chatId, setChatId] = useState(settings.telegramChatId || '');
  const [botUsername, setBotUsername] = useState(settings.botUsername || 'abisundar_bot');
  const [intervalMinutes, setIntervalMinutes] = useState(settings.checkIntervalMinutes || 30);
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(settings.autoCheckEnabled ?? true);
  const [notifyOnStock, setNotifyOnStock] = useState(settings.notifyOnStock ?? true);
  const [showToken, setShowToken] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setToken(settings.telegramToken || '');
      setChatId(settings.telegramChatId || '');
      setBotUsername(settings.botUsername || 'abisundar_bot');
      setIntervalMinutes(settings.checkIntervalMinutes || 30);
      setAutoCheckEnabled(settings.autoCheckEnabled ?? true);
      setNotifyOnStock(settings.notifyOnStock ?? true);
      setTestResult(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onSaveSettings({
        telegramToken: token.trim(),
        telegramChatId: chatId.trim(),
        botUsername: botUsername.trim(),
        checkIntervalMinutes: intervalMinutes,
        autoCheckEnabled,
        notifyOnStock,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    setIsTesting(true);
    try {
      const res = await onSendTestMessage(token.trim(), chatId.trim());
      if (res.success) {
        setTestResult({
          success: true,
          message: `Success! Test message dispatched to chat ${chatId} via @${botUsername}. Check your Telegram app!`,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Failed to send test message. Verify token and chat ID.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error communicating with Telegram server.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500 text-white">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Telegram Bot & Scraper Settings
              </h2>
              <p className="text-xs text-slate-500">
                Configure notifications for{' '}
                <span className="font-semibold text-sky-600">
                  @{botUsername || 'abisundar_bot'}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Telegram Credentials Card */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Telegram Bot Credentials
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showHelp ? 'Hide guide' : 'Setup guide'}</span>
              </button>
            </div>

            {/* Quick Setup Guide Box */}
            {showHelp && (
              <div className="p-4 rounded-xl bg-sky-50/80 border border-sky-200 text-xs text-slate-700 space-y-2">
                <div className="font-bold text-sky-900 flex items-center gap-1.5">
                  <span>How to connect @{botUsername || 'abisundar_bot'}:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
                  <li>
                    Open Telegram and search for{' '}
                    <a
                      href={`https://t.me/${botUsername || 'abisundar_bot'}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-sky-700 underline inline-flex items-center gap-0.5"
                    >
                      @{botUsername || 'abisundar_bot'}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>{' '}
                    and click <span className="font-semibold text-slate-900">/start</span>.
                  </li>
                  <li>
                    To find your personal Chat ID, start a chat with{' '}
                    <a
                      href="https://t.me/userinfobot"
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-sky-700 underline inline-flex items-center gap-0.5"
                    >
                      @userinfobot
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>{' '}
                    which will reply with your numeric <span className="font-semibold text-slate-900">Id</span>.
                  </li>
                  <li>
                    Paste the bot token (from @BotFather) and your Chat ID below, then click{' '}
                    <span className="font-semibold text-slate-900">Test Alert</span>.
                  </li>
                </ol>
              </div>
            )}

            {/* Bot Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bot Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">@</span>
                <input
                  type="text"
                  value={botUsername}
                  onChange={(e) => setBotUsername(e.target.value)}
                  placeholder="abisundar_bot"
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2 text-slate-900 focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Telegram Bot Token */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Telegram Bot Token (TELEGRAM_TOKEN)
                </label>
                {settings.hasTokenConfigured && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Configured
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456789:ABCDefghIJKlmnoPQRstuvWXyz"
                  className="w-full text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-slate-900 focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Matches <code>TELEGRAM_TOKEN</code> used in <code>scraper.py</code>
              </p>
            </div>

            {/* Telegram Chat ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Telegram Chat ID (TELEGRAM_CHAT_ID)
                </label>
                {settings.hasChatIdConfigured && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Configured
                  </span>
                )}
              </div>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="e.g. 123456789 or -100123456789"
                className="w-full text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Your personal Telegram user ID or group/channel chat ID
              </p>
            </div>

            {/* Test Connection Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !token.trim() || !chatId.trim()}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                    <span>Dispatching test alert via @{botUsername || 'abisundar_bot'}...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Live Test Message to Telegram</span>
                  </>
                )}
              </button>
            </div>

            {/* Test Feedback */}
            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Background Checking & Automation Section */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Automated Price Scraping Schedule
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Check Frequency
                </label>
                <select
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10))}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value={5}>Every 5 minutes (Realtime)</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes (Recommended)</option>
                  <option value={60}>Every 1 hour</option>
                  <option value={360}>Every 6 hours (Matches GitHub Cron)</option>
                  <option value={720}>Every 12 hours</option>
                  <option value={1440}>Every 24 hours</option>
                </select>
              </div>

              <div className="flex flex-col justify-end space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCheckEnabled}
                    onChange={(e) => setAutoCheckEnabled(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Enable automatic background checks</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOnStock}
                    onChange={(e) => setNotifyOnStock(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Notify when restocked</span>
                </label>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-indigo-600 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Configuration</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
