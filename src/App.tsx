import { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { StatsCards } from './components/StatsCards.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { AddProductModal } from './components/AddProductModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { AlertsModal } from './components/AlertsModal.tsx';
import { PriceHistoryModal } from './components/PriceHistoryModal.tsx';
import { ScraperInspectorModal } from './components/ScraperInspectorModal.tsx';
import { TrackedProduct, TrackerSettings, AlertLog } from './types.ts';
import {
  Search,
  Filter,
  Plus,
  Send,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Github,
  Zap,
  Package,
} from 'lucide-react';

const DEFAULT_SETTINGS: TrackerSettings = {
  telegramToken: '',
  telegramChatId: '',
  botUsername: 'abisundar_bot',
  checkIntervalMinutes: 30,
  autoCheckEnabled: true,
  notifyOnStock: true,
  hasTokenConfigured: false,
  hasChatIdConfigured: false,
};

export default function App() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [settings, setSettings] = useState<TrackerSettings>(DEFAULT_SETTINGS);
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BELOW_TARGET' | 'IN_STOCK'>('ALL');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<TrackedProduct | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const loadAllData = async () => {
    try {
      const [prodRes, settRes, alertRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/settings'),
        fetch('/api/alerts'),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }
      if (settRes.ok) {
        const settData = await settRes.json();
        setSettings(settData);
      }
      if (alertRes.ok) {
        const alertData = await alertRes.json();
        setAlerts(alertData);
      }
    } catch (err) {
      console.error('Failed to load initial tracker data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // Refresh alerts and products periodically on client
    const timer = setInterval(async () => {
      try {
        const [prodRes, alertRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/alerts'),
        ]);
        if (prodRes.ok) setProducts(await prodRes.json());
        if (alertRes.ok) setAlerts(await alertRes.json());
      } catch {
        // silent background refresh error
      }
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  const handleCheckAll = async () => {
    setIsCheckingAll(true);
    try {
      const res = await fetch('/api/products/check-all', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(
          `Checked ${data.checkedCount} speedcubes. ${data.alertsSent} Telegram alert(s) sent!`,
          'success'
        );
        loadAllData();
      } else {
        showToast(data.error || 'Failed to check products', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Check failed', 'error');
    } finally {
      setIsCheckingAll(false);
    }
  };

  const handleCheckProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? data.product : p))
        );
        if (data.alertSent) {
          showToast(
            `Price alert sent to Telegram for "${data.product.title}"!`,
            'success'
          );
          // reload alerts
          const alertRes = await fetch('/api/alerts');
          if (alertRes.ok) setAlerts(await alertRes.json());
        } else {
          showToast(`Checked price: ₹${data.product.currentPrice}`, 'info');
        }
      } else {
        showToast(data.error || 'Check failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Check error', 'error');
    }
  };

  const handleForceAlert = async (id: string) => {
    if (!settings.hasTokenConfigured || !settings.hasChatIdConfigured) {
      setIsSettingsOpen(true);
      showToast(
        'Please configure your Telegram Token and Chat ID first!',
        'error'
      );
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceAlert: true }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.alertSent) {
          showToast(
            `Live notification dispatched to @${settings.botUsername || 'abisundar_bot'}!`,
            'success'
          );
          const alertRes = await fetch('/api/alerts');
          if (alertRes.ok) setAlerts(await alertRes.json());
        } else {
          showToast(
            `Telegram alert failed: ${data.alertError || 'Check credentials'}`,
            'error'
          );
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch alert', 'error');
    }
  };

  const handleUpdateProduct = async (
    id: string,
    updates: { targetPrice?: number; alertEnabled?: boolean; selectedVariantId?: number }
  ) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
        showToast('Updated successfully', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!window.confirm(`Stop tracking "${p?.title || 'this cube'}"?`)) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts((prev) => prev.filter((x) => x.id !== id));
        showToast('Product removed from tracking', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  const handleAddProduct = async (data: {
    url: string;
    targetPrice: number;
    selectedVariantId?: number;
    alertEnabled: boolean;
  }) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const newProd = await res.json();
    if (!res.ok) {
      throw new Error(newProd.error || 'Failed to add product');
    }
    setProducts((prev) => [newProd, ...prev.filter((p) => p.id !== newProd.id)]);
    showToast(`Started tracking ${newProd.title}!`, 'success');
  };

  const handleSaveSettings = async (updates: Partial<TrackerSettings>) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const newSettings = await res.json();
      setSettings(newSettings);
      showToast('Settings saved successfully', 'success');
    }
  };

  const handleSendTestMessage = async (token?: string, chatId?: string) => {
    const res = await fetch('/api/telegram/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, chatId }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      const alertRes = await fetch('/api/alerts');
      if (alertRes.ok) setAlerts(await alertRes.json());
      return { success: true };
    }
    return { success: false, error: data.error };
  };

  const handleClearAlerts = async () => {
    const res = await fetch('/api/alerts', { method: 'DELETE' });
    if (res.ok) {
      setAlerts([]);
      showToast('Alerts history cleared', 'info');
    }
  };

  // Extract unique brands for filtering
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.vendor) set.add(p.vendor);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      const matchesSearch =
        searchQuery === '' ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.handle?.toLowerCase().includes(searchQuery.toLowerCase());

      // Brand
      const matchesBrand = selectedBrand === 'ALL' || p.vendor === selectedBrand;

      // Status
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'BELOW_TARGET' && p.inStock && p.currentPrice <= p.targetPrice) ||
        (statusFilter === 'IN_STOCK' && p.inStock);

      return matchesSearch && matchesBrand && matchesStatus;
    });
  }, [products, searchQuery, selectedBrand, statusFilter]);

  const isBotConfigured = settings.hasTokenConfigured && settings.hasChatIdConfigured;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Toast popup */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navigation */}
      <Navbar
        settings={settings}
        unreadAlertsCount={alerts.length}
        isCheckingAll={isCheckingAll}
        onCheckAll={handleCheckAll}
        onOpenAddModal={() => setIsAddOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenInspector={() => setIsInspectorOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Telegram Configuration Notice Banner (if not set up) */}
        {!isBotConfigured && (
          <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-sky-50 border border-sky-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-sky-500 text-white shadow-sm flex-shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Connect @{settings.botUsername || 'abisundar_bot'} for Telegram Notifications</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    Action Needed
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Set up your bot token and chat ID to receive instant alerts whenever prices drop on Cubelelo.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Configure Bot Now</span>
            </button>
          </div>
        )}

        {/* Overview Stats */}
        <StatsCards
          products={products}
          settings={settings}
          totalAlertsSent={alerts.filter((a) => a.success).length}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAlerts={() => setIsAlertsOpen(true)}
        />

        {/* Filter and Toolbar Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search speedcubes by name, brand, or slug..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status filter tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({products.length})
              </button>
              <button
                onClick={() => setStatusFilter('BELOW_TARGET')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  statusFilter === 'BELOW_TARGET'
                    ? 'bg-white text-emerald-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Target Met (
                {products.filter((p) => p.inStock && p.currentPrice <= p.targetPrice).length}
                )
              </button>
              <button
                onClick={() => setStatusFilter('IN_STOCK')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  statusFilter === 'IN_STOCK'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                In Stock ({products.filter((p) => p.inStock).length})
              </button>
            </div>

            {/* Brand Filter */}
            {availableBrands.length > 1 && (
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="ALL">All Brands</option>
                {availableBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">
              Connecting to Cubelelo Tracker service...
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center my-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {products.length === 0 ? 'No Products Tracked Yet' : 'No Matching Speedcubes Found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5">
              {products.length === 0
                ? 'Start monitoring prices and stock for your favorite 3x3s, 4x4s, and competition puzzles from Cubelelo.com.'
                : 'Try adjusting your search query or filters above.'}
            </p>
            <div className="mt-5">
              <button
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Track a Cube</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onCheck={handleCheckProduct}
                onForceAlert={handleForceAlert}
                onUpdate={handleUpdateProduct}
                onDelete={handleDeleteProduct}
                onViewHistory={(p) => setHistoryProduct(p)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">CubeleloTrack</span>
            <span>•</span>
            <span>Real-time speedcube scraper & Telegram bot alert system</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/sabishekkrishna/cloud"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub Rep</span>
            </a>
            <a
              href={`https://t.me/${settings.botUsername || 'abisundar_bot'}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>@{settings.botUsername || 'abisundar_bot'}</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddProductModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddProduct}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onSendTestMessage={handleSendTestMessage}
      />

      <AlertsModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onClearAlerts={handleClearAlerts}
      />

      <PriceHistoryModal
        product={historyProduct}
        onClose={() => setHistoryProduct(null)}
      />

      <ScraperInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
      />
    </div>
  );
}
