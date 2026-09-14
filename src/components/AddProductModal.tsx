import { useState, type FormEvent } from 'react';
import {
  X,
  Plus,
  Sparkles,
  ExternalLink,
  Package,
  CheckCircle2,
  Loader2,
  AlertCircle,
  TrendingDown,
  Percent,
} from 'lucide-react';
import { ScrapedProductData, ProductVariant } from '../types.ts';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    url: string;
    targetPrice: number;
    selectedVariantId?: number;
    alertEnabled: boolean;
  }) => Promise<void>;
}

const POPULAR_CUBES = [
  {
    title: 'MoYu RS3M v5 SE (Magnetic)',
    handle: 'moyu-rs3m-v5-se-magnetic',
    vendor: 'MoYu',
    url: 'https://www.cubelelo.com/products/moyu-rs3m-v5-se-magnetic',
    category: '3x3 Flagship Special Edition',
  },
  {
    title: 'QiYi X-Man Tornado V5 3x3 Magnetic',
    handle: 'qiyi-x-man-tornado-v5-3x3-magnetic',
    vendor: 'QiYi',
    url: 'https://www.cubelelo.com/products/qiyi-x-man-tornado-v5-3x3-magnetic',
    category: 'Competition Flagship',
  },
  {
    title: 'MoYu AoLong V5 3x3 Magnetic',
    handle: 'moyu-aolong-v5-3x3-magnetic',
    vendor: 'MoYu',
    url: 'https://www.cubelelo.com/products/moyu-aolong-v5-3x3-magnetic',
    category: 'Speedcube Classic Reinvented',
  },
  {
    title: 'GAN V100 3x3 Magnetic MagLev UV',
    handle: 'gan-v100-3x3-magnetic-maglev-core-magnets-uv',
    vendor: 'GAN',
    url: 'https://www.cubelelo.com/products/gan-v100-3x3-magnetic-maglev-core-magnets-uv',
    category: 'Ultra Premium Flagship',
  },
];

export function AddProductModal({ isOpen, onClose, onAdd }: AddProductModalProps) {
  const [urlInput, setUrlInput] = useState('');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<ScrapedProductData | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchPreview = async (urlToFetch?: string) => {
    const targetUrl = urlToFetch || urlInput.trim();
    if (!targetUrl) {
      setError('Please enter a Cubelelo product URL or handle.');
      return;
    }

    setError(null);
    setIsLoadingPreview(true);

    try {
      const res = await fetch('/api/products/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to scrape Cubelelo product');
      }

      setPreviewData(data);
      setUrlInput(data.url);
      setSelectedVariantId(data.selectedVariant.id);
      // default target price to 10% below current price or current price
      const suggestedTarget = Math.round(data.currentPrice * 0.95);
      setTargetPrice(suggestedTarget.toString());
    } catch (err: any) {
      setError(err.message || 'Could not fetch product from Cubelelo. Check URL.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSelectPopular = (cubeUrl: string) => {
    setUrlInput(cubeUrl);
    handleFetchPreview(cubeUrl);
  };

  const handleVariantSelect = (v: ProductVariant) => {
    setSelectedVariantId(v.id);
    const suggestedTarget = Math.round(v.price * 0.95);
    setTargetPrice(suggestedTarget.toString());
  };

  const applyDiscountPercent = (pct: number) => {
    if (!previewData) return;
    const currentVar =
      previewData.variants.find((v) => v.id === selectedVariantId) ||
      previewData.selectedVariant;
    const price = currentVar.price;
    const discounted = Math.round(price * (1 - pct / 100));
    setTargetPrice(discounted.toString());
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setError('Please enter a Cubelelo URL.');
      return;
    }

    const parsedTarget = parseFloat(targetPrice);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setError('Please enter a valid target alert price in ₹.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onAdd({
        url: urlInput.trim(),
        targetPrice: parsedTarget,
        selectedVariantId,
        alertEnabled,
      });
      onClose();
      // Reset form
      setUrlInput('');
      setPreviewData(null);
      setTargetPrice('');
    } catch (err: any) {
      setError(err.message || 'Failed to add product to tracker.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600 text-white">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Track New Speedcube</h2>
              <p className="text-xs text-slate-500">
                Cubelelo Shopify scraper with Telegram alert trigger
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* URL / Handle Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Cubelelo Product URL or Slug
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.cubelelo.com/products/moyu-rs3m-v5-se-magnetic"
                className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => handleFetchPreview()}
                disabled={isLoadingPreview || !urlInput.trim()}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-indigo-600 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              >
                {isLoadingPreview ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Scraping...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Inspect</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Supports full URLs or product slugs (e.g. <code>moyu-rs3m-v5-se-magnetic</code>)
            </p>
          </div>

          {/* Quick presets */}
          {!previewData && (
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-2">
                Or Quick Pick Popular Speedcubes:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {POPULAR_CUBES.map((item) => (
                  <button
                    key={item.handle}
                    type="button"
                    onClick={() => handleSelectPopular(item.url)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-indigo-50/50 hover:border-indigo-200 text-left transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400">{item.category}</div>
                    </div>
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scraped Live Preview Box */}
          {previewData && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Live Scraped Data:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium text-[11px] border border-indigo-100">
                  <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                  {previewData.methodUsed === 'shopify_json'
                    ? 'Shopify JSON API'
                    : 'HTML Meta Fallback'}
                </span>
              </div>

              <div className="flex gap-3 items-center">
                <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 p-1 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {previewData.imageUrl ? (
                    <img
                      src={previewData.imageUrl}
                      alt={previewData.title}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {previewData.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span className="font-medium">{previewData.vendor}</span>
                    <span>•</span>
                    <span
                      className={`font-semibold ${
                        previewData.inStock ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {previewData.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Variant Selector */}
              {previewData.variants.length > 1 && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Select Variant to Monitor:
                  </label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {previewData.variants.map((v) => (
                      <label
                        key={v.id}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          selectedVariantId === v.id
                            ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="variant"
                            checked={selectedVariantId === v.id}
                            onChange={() => handleVariantSelect(v)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{v.title}</span>
                        </div>
                        <span className="font-bold">₹{v.price.toLocaleString('en-IN')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Target Price Configuration */}
              <div className="pt-2 border-t border-slate-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Target Alert Price (₹ INR)
                  </label>
                  <span className="text-xs text-slate-500">
                    Current: ₹
                    {(
                      previewData.variants.find((v) => v.id === selectedVariantId) ||
                      previewData.selectedVariant
                    ).price.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    required
                    placeholder="Enter target price threshold"
                    className="w-full text-sm font-semibold bg-white border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Quick discount pills */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                    <Percent className="w-3 h-3" /> Presets:
                  </span>
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyDiscountPercent(pct)}
                      className="px-2 py-0.5 text-[11px] font-semibold rounded bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 transition-colors"
                    >
                      {pct === 0 ? 'Current' : `-${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alert Toggle */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">
                    Telegram Notifications
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Send alert message when price drops to or below target
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={alertEnabled}
                  onChange={(e) => setAlertEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !urlInput.trim() || !targetPrice}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-200 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding to Tracker...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Start Tracking</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
