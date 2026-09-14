import { useState } from 'react';
import {
  ExternalLink,
  RefreshCw,
  TrendingDown,
  Bell,
  BellOff,
  Trash2,
  Check,
  Edit2,
  LineChart,
  Send,
  AlertCircle,
  Package,
} from 'lucide-react';
import { TrackedProduct } from '../types.ts';

interface ProductCardProps {
  key?: string;
  product: TrackedProduct;
  onCheck: (id: string) => Promise<void>;
  onForceAlert: (id: string) => Promise<void>;
  onUpdate: (
    id: string,
    updates: { targetPrice?: number; alertEnabled?: boolean; selectedVariantId?: number }
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onViewHistory: (product: TrackedProduct) => void;
}

export function ProductCard({
  product,
  onCheck,
  onForceAlert,
  onUpdate,
  onDelete,
  onViewHistory,
}: ProductCardProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isAlerting, setIsAlerting] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(product.targetPrice.toString());
  const [imgError, setImgError] = useState(false);

  const isBelowTarget = product.inStock && product.currentPrice <= product.targetPrice;
  const discountPercent =
    product.originalPrice && product.originalPrice > product.currentPrice
      ? Math.round(((product.originalPrice - product.currentPrice) / product.originalPrice) * 100)
      : null;

  const handleCheck = async () => {
    try {
      setIsChecking(true);
      await onCheck(product.id);
    } finally {
      setIsChecking(false);
    }
  };

  const handleForceAlert = async () => {
    try {
      setIsAlerting(true);
      await onForceAlert(product.id);
    } finally {
      setIsAlerting(false);
    }
  };

  const handleSaveTarget = async () => {
    const val = parseFloat(targetInput);
    if (!isNaN(val) && val > 0) {
      await onUpdate(product.id, { targetPrice: val });
    }
    setIsEditingTarget(false);
  };

  const handleVariantChange = async (variantId: number) => {
    await onUpdate(product.id, { selectedVariantId: variantId });
  };

  const handleToggleAlert = async () => {
    await onUpdate(product.id, { alertEnabled: !product.alertEnabled });
  };

  // Format relative time
  const formatTime = (iso: string) => {
    if (!iso) return 'Never';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
        isBelowTarget
          ? 'border-emerald-300 shadow-md shadow-emerald-50 ring-2 ring-emerald-500/10'
          : 'border-slate-200/90 hover:border-slate-300 shadow-xs'
      }`}
    >
      <div>
        {/* Card Header & Status Banner */}
        {isBelowTarget ? (
          <div className="bg-emerald-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Target Met! (Current ₹{product.currentPrice.toLocaleString('en-IN')} ≤ Target ₹{product.targetPrice.toLocaleString('en-IN')})</span>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded uppercase font-bold tracking-wide">
              Alert Active
            </span>
          </div>
        ) : !product.inStock ? (
          <div className="bg-rose-50 text-rose-700 px-4 py-2 text-xs font-medium flex items-center gap-1.5 border-b border-rose-100">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Out of Stock on Cubelelo</span>
          </div>
        ) : null}

        <div className="p-5">
          {/* Top meta tags */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                {product.vendor || 'Cubelelo'}
              </span>
              {product.productType && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                  {product.productType}
                </span>
              )}
            </div>

            {/* In Stock Badge */}
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  product.inStock ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  product.inStock ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {product.inStock ? 'In Stock' : 'Sold Out'}
              </span>
            </div>
          </div>

          {/* Product Body: Thumbnail & Details */}
          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-50 border border-slate-100 p-1 flex-shrink-0 flex items-center justify-center overflow-hidden">
              {product.imageUrl && !imgError ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-full h-full object-contain hover:scale-105 transition-transform duration-200"
                  onError={() => setImgError(true)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Package className="w-8 h-8 text-slate-300" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2 hover:text-indigo-600 transition-colors">
                <a
                  href={product.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 group"
                >
                  <span>{product.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </a>
              </h3>

              {/* Variant Selector (if multi-variant) */}
              {product.variants && product.variants.length > 1 ? (
                <div className="mt-2">
                  <label className="text-[11px] font-medium text-slate-500 block mb-0.5">
                    Variant:
                  </label>
                  <select
                    value={product.selectedVariantId}
                    onChange={(e) => handleVariantChange(parseInt(e.target.value, 10))}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {product.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title} — ₹{v.price.toLocaleString('en-IN')}{' '}
                        {!v.available ? '(Out of Stock)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="mt-1">
                  <span className="text-xs text-slate-500">
                    {product.selectedVariantTitle !== 'Standard'
                      ? product.selectedVariantTitle
                      : 'Standard Edition'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Row */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Current Price</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  ₹{product.currentPrice.toLocaleString('en-IN')}
                </span>
                {product.originalPrice && product.originalPrice > product.currentPrice && (
                  <span className="text-xs text-slate-400 line-through">
                    ₹{product.originalPrice.toLocaleString('en-IN')}
                  </span>
                )}
                {discountPercent && (
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
            </div>

            {/* Target Price Section with Inline Edit */}
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Target Price</span>
              {isEditingTarget ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-sm font-semibold text-slate-700">₹</span>
                  <input
                    type="number"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    className="w-20 px-1.5 py-0.5 text-xs font-semibold border border-indigo-400 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTarget();
                      if (e.key === 'Escape') setIsEditingTarget(false);
                    }}
                  />
                  <button
                    onClick={handleSaveTarget}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    title="Save target price"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span
                    className={`text-sm font-bold ${
                      isBelowTarget ? 'text-emerald-600' : 'text-slate-800'
                    }`}
                  >
                    ₹{product.targetPrice.toLocaleString('en-IN')}
                  </span>
                  <button
                    onClick={() => {
                      setTargetInput(product.targetPrice.toString());
                      setIsEditingTarget(true);
                    }}
                    className="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-colors"
                    title="Click to edit target price threshold"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="text-[10px] text-right mt-0.5">
                {isBelowTarget ? (
                  <span className="text-emerald-600 font-semibold">✓ Meets Target</span>
                ) : (
                  <span className="text-slate-400">
                    ₹{(product.currentPrice - product.targetPrice).toLocaleString('en-IN')} to target
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Last checked indicator */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Checked: {formatTime(product.lastChecked)}</span>
            {product.lastStatus === 'error' && (
              <span className="text-rose-500 font-medium truncate max-w-[150px]">
                {product.lastErrorMessage || 'Check error'}
              </span>
            )}
            {product.lastAlertSentAt && (
              <span className="text-emerald-600 font-medium">
                Telegram sent: {formatTime(product.lastAlertSentAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Check Now */}
          <button
            onClick={handleCheck}
            disabled={isChecking}
            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors disabled:opacity-50"
            title="Check current price on Cubelelo now"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Send Test Alert */}
          <button
            onClick={handleForceAlert}
            disabled={isAlerting}
            className="p-2 text-slate-600 hover:text-sky-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors disabled:opacity-50"
            title="Send live notification to Telegram now"
          >
            <Send className={`w-4 h-4 ${isAlerting ? 'animate-pulse text-sky-600' : ''}`} />
          </button>

          {/* Price History */}
          <button
            onClick={() => onViewHistory(product)}
            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
            title="View price history chart"
          >
            <LineChart className="w-4 h-4" />
          </button>

          {/* Alert Toggle */}
          <button
            onClick={handleToggleAlert}
            className={`p-2 rounded-lg border transition-colors ${
              product.alertEnabled
                ? 'text-indigo-600 bg-indigo-50/50 border-indigo-100 hover:bg-indigo-100/50'
                : 'text-slate-400 hover:text-slate-600 hover:bg-white border-transparent'
            }`}
            title={product.alertEnabled ? 'Notifications enabled' : 'Notifications disabled'}
          >
            {product.alertEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Delete */}
          <button
            onClick={() => onDelete(product.id)}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
            title="Remove from tracking"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Buy on Cubelelo */}
          <a
            href={product.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-indigo-600 text-white transition-colors shadow-xs"
          >
            <span>Buy</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
