import { X, TrendingDown, TrendingUp, Calendar, Package } from 'lucide-react';
import { TrackedProduct } from '../types.ts';

interface PriceHistoryModalProps {
  product: TrackedProduct | null;
  onClose: () => void;
}

export function PriceHistoryModal({ product, onClose }: PriceHistoryModalProps) {
  if (!product) return null;

  const history = [...(product.priceHistory || [])].reverse();
  const prices = product.priceHistory?.map((h) => h.price) || [product.currentPrice];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-1 flex-shrink-0 flex items-center justify-center overflow-hidden">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Package className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 line-clamp-1">
                {product.title}
              </h2>
              <p className="text-xs text-slate-500">Price History & Stock Log</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Summary Mini Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <span className="text-[11px] text-slate-400 font-medium block">Current</span>
              <span className="text-base font-bold text-slate-900">
                ₹{product.currentPrice.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-center">
              <span className="text-[11px] text-emerald-600 font-medium block">All-time Low</span>
              <span className="text-base font-bold text-emerald-700">
                ₹{minPrice.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200/80 text-center">
              <span className="text-[11px] text-indigo-600 font-medium block">Target Alert</span>
              <span className="text-base font-bold text-indigo-700">
                ₹{product.targetPrice.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
              Recorded Price Points
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((pt, index) => {
                const date = new Date(pt.timestamp).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                });
                const prev = history[index + 1];
                const priceDiff = prev ? pt.price - prev.price : 0;

                return (
                  <div
                    key={index}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-600">{date}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {priceDiff < 0 ? (
                        <span className="text-emerald-600 font-medium flex items-center gap-0.5 text-[11px]">
                          <TrendingDown className="w-3 h-3" />
                          -₹{Math.abs(priceDiff)}
                        </span>
                      ) : priceDiff > 0 ? (
                        <span className="text-rose-600 font-medium flex items-center gap-0.5 text-[11px]">
                          <TrendingUp className="w-3 h-3" />
                          +₹{priceDiff}
                        </span>
                      ) : null}

                      <span className="font-bold text-slate-900 text-sm">
                        ₹{pt.price.toLocaleString('en-IN')}
                      </span>

                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                          pt.inStock
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {pt.inStock ? 'In Stock' : 'Sold Out'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
