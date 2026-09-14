import { TrackedProduct, TrackerSettings } from '../types.ts';
import { Tag, TrendingDown, Send, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface StatsCardsProps {
  products: TrackedProduct[];
  settings: TrackerSettings;
  totalAlertsSent: number;
  onOpenSettings: () => void;
  onOpenAlerts: () => void;
}

export function StatsCards({
  products,
  settings,
  totalAlertsSent,
  onOpenSettings,
  onOpenAlerts,
}: StatsCardsProps) {
  const belowTargetProducts = products.filter(
    (p) => p.inStock && p.currentPrice <= p.targetPrice
  );
  const activeAlerts = products.filter((p) => p.alertEnabled).length;
  const isBotReady = settings.hasTokenConfigured && settings.hasChatIdConfigured;

  // Calculate potential savings for products below target
  const totalSavings = belowTargetProducts.reduce((acc, p) => {
    if (p.originalPrice && p.originalPrice > p.currentPrice) {
      return acc + (p.originalPrice - p.currentPrice);
    }
    return acc;
  }, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Stat 1: Tracked Products */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Tracked Speedcubes
          </span>
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Tag className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900">
            {products.length}
          </span>
          <span className="text-xs font-medium text-slate-500">
            {activeAlerts} alerts active
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span>Shopify JSON API Realtime</span>
        </div>
      </div>

      {/* Stat 2: Price Drops / Below Target */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Target Price Met
          </span>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-emerald-600">
            {belowTargetProducts.length}
          </span>
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            Ready to Buy
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {totalSavings > 0
            ? `Save up to ₹${totalSavings.toLocaleString('en-IN')} off M.R.P`
            : 'Monitoring price drops 24/7'}
        </div>
      </div>

      {/* Stat 3: Telegram Bot Integration */}
      <div
        onClick={onOpenSettings}
        className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden cursor-pointer hover:border-slate-300 transition-colors group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Telegram Bot
          </span>
          <div className="p-2 rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-100 transition-colors">
            <Send className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight text-slate-900 truncate">
            @{settings.botUsername || 'abisundar_bot'}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          {isBotReady ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Connected & Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Configure Token/Chat ID
            </span>
          )}
        </div>
      </div>

      {/* Stat 4: Alerts Sent */}
      <div
        onClick={onOpenAlerts}
        className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden cursor-pointer hover:border-slate-300 transition-colors group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Alerts Dispatched
          </span>
          <div className="p-2 rounded-lg bg-violet-50 text-violet-600 group-hover:bg-violet-100 transition-colors">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900">
            {totalAlertsSent}
          </span>
          <span className="text-xs font-medium text-slate-500">
            messages sent
          </span>
        </div>
        <div className="mt-2 text-xs text-indigo-600 group-hover:underline">
          View notification history &rarr;
        </div>
      </div>
    </div>
  );
}
