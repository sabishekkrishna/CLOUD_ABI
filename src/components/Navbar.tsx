import { useState } from 'react';
import {
  Bell,
  RefreshCw,
  Settings as SettingsIcon,
  Plus,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Cloud,
} from 'lucide-react';
import type { TrackerSettings } from '../types.ts';

interface NavbarProps {
  settings: TrackerSettings;
  unreadAlertsCount: number;
  isCheckingAll: boolean;
  onCheckAll: () => Promise<void>;
  onOpenAddModal: () => void;
  onOpenSettings: () => void;
  onOpenAlerts: () => void;
  onOpenInspector: () => void;
  onOpenDeploy: () => void;
}

export function Navbar({
  settings,
  unreadAlertsCount,
  isCheckingAll,
  onCheckAll,
  onOpenAddModal,
  onOpenSettings,
  onOpenAlerts,
  onOpenInspector,
  onOpenDeploy,
}: NavbarProps) {
  const isBotConfigured = settings.hasTokenConfigured && settings.hasChatIdConfigured;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-md shadow-indigo-200">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  Cubelelo<span className="text-indigo-600">Track</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Live Scraper
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Speedcube price alerts via Telegram bot{' '}
                <a
                  href={`https://t.me/${settings.botUsername || 'abisundar_bot'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                >
                  @{settings.botUsername || 'abisundar_bot'}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </p>
            </div>
          </div>

          {/* Center / Status Chips */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Bot Status Badge */}
            <button
              onClick={onOpenSettings}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isBotConfigured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="Configure Telegram Bot token & chat ID"
            >
              <Send className="w-3.5 h-3.5 text-sky-500" />
              <span>@{settings.botUsername || 'abisundar_bot'}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isBotConfigured ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span className="font-normal text-[11px] opacity-80">
                {isBotConfigured ? 'Connected' : 'Setup Required'}
              </span>
            </button>

            {/* Check Interval */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <RefreshCw className="w-3 h-3 text-slate-400" />
              <span>
                {settings.autoCheckEnabled
                  ? `Every ${settings.checkIntervalMinutes}m`
                  : 'Manual Only'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Scraper Inspector / Test Sandbox */}
            <button
              onClick={onOpenInspector}
              className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
              title="Inspect Cubelelo Shopify API & Fallback Scraper"
            >
              <Code2 className="w-4 h-4 text-slate-500" />
              <span className="hidden md:inline">API Inspector</span>
            </button>

            {/* Check All Button */}
            <button
              onClick={onCheckAll}
              disabled={isCheckingAll}
              className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-60 shadow-xs"
              title="Check all tracked products now"
            >
              <RefreshCw
                className={`w-4 h-4 text-indigo-600 ${
                  isCheckingAll ? 'animate-spin' : ''
                }`}
              />
              <span className="hidden sm:inline">
                {isCheckingAll ? 'Checking...' : 'Check All'}
              </span>
            </button>

            {/* Alert Logs Button */}
            <button
              onClick={onOpenAlerts}
              className="relative p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
              title="View Telegram alert history"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full shadow-xs">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
              title="Telegram & tracker settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            {/* Cloud Deployment Button */}
            <button
              onClick={onOpenDeploy}
              className="p-2 sm:px-2.5 sm:py-2 text-xs font-medium text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200/80 rounded-lg transition-colors flex items-center gap-1.5"
              title="Serverless Cloud Deployment (Google Cloud Run, Railway, Render)"
            >
              <Cloud className="w-4 h-4 text-indigo-600" />
              <span className="hidden xl:inline">Cloud Deploy</span>
            </button>

            {/* Primary Add Cube Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition-all hover:shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Add Cube</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
