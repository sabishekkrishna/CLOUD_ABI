import { useState } from 'react';
import {
  X,
  Code2,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { ScrapedProductData } from '../types.ts';

interface ScraperInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScraperInspectorModal({ isOpen, onClose }: ScraperInspectorModalProps) {
  const [testUrl, setTestUrl] = useState(
    'https://www.cubelelo.com/products/moyu-rs3m-v5-se-magnetic'
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapedProductData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!testUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/products/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: testUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Scraper failed to extract product data.');
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred during scraping.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600 text-white">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Cubelelo Scraper API Inspector
              </h2>
              <p className="text-xs text-slate-500">
                Direct testbed for the techniques in sabishekkrishna/cloud
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Technique explanation */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 space-y-1.5">
            <span className="font-bold flex items-center gap-1 text-indigo-950">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Two-Phase Extraction Pipeline:
            </span>
            <p className="text-indigo-800 leading-relaxed">
              <strong>Method 1:</strong> Direct Shopify JSON API (
              <code>https://www.cubelelo.com/products/&lt;handle&gt;.json</code>) returning full variant list, SKUs, inventory status, and pricing in INR.
            </p>
            <p className="text-indigo-800 leading-relaxed">
              <strong>Method 2 (Fallback):</strong> Regex extraction from OpenGraph meta tags (
              <code>og:price:amount</code>, <code>product:price:amount</code>, <code>og:title</code>).
            </p>
          </div>

          {/* Test URL Form */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
              Test Cubelelo URL or Handle:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="https://www.cubelelo.com/products/..."
                className="flex-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={loading || !testUrl.trim()}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Scraping...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Extraction</span>
                  </>
                )}
              </button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400">Samples:</span>
              {[
                {
                  name: 'MoYu RS3M V5 SE',
                  url: 'https://www.cubelelo.com/products/moyu-rs3m-v5-se-magnetic',
                },
                {
                  name: 'Tornado V3 Flagship',
                  url: 'https://www.cubelelo.com/products/qiyi-x-man-tornado-v3-m-3x3-flagship',
                },
                {
                  name: 'GAN 12 M Leap',
                  url: 'https://www.cubelelo.com/products/gan-12-m-leap-3x3',
                },
              ].map((sample) => (
                <button
                  key={sample.name}
                  type="button"
                  onClick={() => {
                    setTestUrl(sample.url);
                  }}
                  className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>

          {/* Errors */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Extracted Payload</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Method: {result.methodUsed}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied JSON</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick visual card */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">{result.title}</span>
                  <span className="text-slate-500">
                    Vendor: {result.vendor} • Variants: {result.variants.length}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900 block">
                    ₹{result.currentPrice.toLocaleString('en-IN')}
                  </span>
                  <span
                    className={`font-semibold ${
                      result.inStock ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {result.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {/* Raw JSON viewer */}
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto max-h-72 leading-relaxed">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
