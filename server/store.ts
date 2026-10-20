import fs from 'fs';
import path from 'path';
import type { TrackedProduct, TrackerSettings, AlertLog } from '../src/types.ts';

interface StoreData {
  products: TrackedProduct[];
  settings: TrackerSettings;
  alerts: AlertLog[];
}

function resolveDataDir(): string {
  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR;
  }
  if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL) {
    return path.join('/tmp', 'cubelelo_data');
  }
  const defaultDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }
    const testFile = path.join(defaultDir, '.write_test');
    fs.writeFileSync(testFile, 'ok', 'utf-8');
    fs.unlinkSync(testFile);
    return defaultDir;
  } catch {
    const tmpDir = path.join('/tmp', 'cubelelo_data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      return tmpDir;
    } catch {
      return defaultDir;
    }
  }
}

export const DATA_DIR = resolveDataDir();
export const DATA_FILE = path.join(DATA_DIR, 'tracker_data.json');

const DEFAULT_SETTINGS: TrackerSettings = {
  telegramToken: process.env.TELEGRAM_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  botUsername: 'abisundar_bot',
  checkIntervalMinutes: 30,
  autoCheckEnabled: true,
  notifyOnStock: true,
  hasTokenConfigured: Boolean(process.env.TELEGRAM_TOKEN),
  hasChatIdConfigured: Boolean(process.env.TELEGRAM_CHAT_ID),
};

const DEFAULT_PRODUCTS: TrackedProduct[] = [
  {
    id: 'moyu-rs3m-v5-se',
    url: 'https://www.cubelelo.com/products/moyu-rs3m-v5-se-magnetic',
    handle: 'moyu-rs3m-v5-se-magnetic',
    title: 'MoYu RS3M v5 SE (Magnetic)',
    vendor: 'MoYu',
    productType: '3x3',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0270/0342/0758/files/6128019603Z.png?v=1762001605',
    selectedVariantId: 51965650075937,
    selectedVariantTitle: 'MagLev, Ball Core, UV Coated',
    variants: [
      {
        id: 51965650075937,
        title: 'MagLev, Ball Core, UV Coated',
        price: 2999,
        compareAtPrice: 3499,
        available: true,
        sku: '1030596',
      },
      {
        id: 51965650108705,
        title: 'Dual-Adjustment',
        price: 1099,
        compareAtPrice: 1299,
        available: true,
        sku: '1030597',
      },
    ],
    currentPrice: 2999,
    originalPrice: 3499,
    targetPrice: 3000,
    inStock: true,
    alertEnabled: true,
    lastChecked: new Date().toISOString(),
    lastStatus: 'ok',
    priceHistory: [
      {
        timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
        price: 3499,
        inStock: true,
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        price: 3199,
        inStock: true,
      },
      {
        timestamp: new Date().toISOString(),
        price: 2999,
        inStock: true,
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
  },
  {
    id: 'moyu-aolong-v5-3x3-magnetic',
    url: 'https://www.cubelelo.com/products/moyu-aolong-v5-3x3-magnetic',
    handle: 'moyu-aolong-v5-3x3-magnetic',
    title: 'MoYu AoLong v5 3x3 M',
    vendor: 'MoYu',
    productType: '3x3',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0270/0342/0758/files/MYAL044__1_66272aa6-0bf5-4f3a-9bb0-da5365ed4690.jpg?v=1781864902',
    selectedVariantId: 52867770319137,
    selectedVariantTitle: 'Magnetic',
    variants: [
      {
        id: 52867770319137,
        title: 'Magnetic',
        price: 1699,
        compareAtPrice: 1999,
        available: true,
      },
      {
        id: 52867797778721,
        title: 'Magnetic UV',
        price: 2149,
        compareAtPrice: 2499,
        available: true,
      },
      {
        id: 52867797811489,
        title: '8 Magnet Ball Core MagLev UV',
        price: 3599,
        compareAtPrice: 3999,
        available: true,
      },
      {
        id: 52867797844257,
        title: '20 Magnet Ball Core MagLev UV',
        price: 4299,
        compareAtPrice: 4799,
        available: true,
      },
    ],
    currentPrice: 1699,
    originalPrice: 1999,
    targetPrice: 1700,
    inStock: true,
    alertEnabled: true,
    lastChecked: new Date().toISOString(),
    lastStatus: 'ok',
    priceHistory: [
      {
        timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        price: 1999,
        inStock: true,
      },
      {
        timestamp: new Date().toISOString(),
        price: 1699,
        inStock: true,
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
];

let inMemoryStore: StoreData = {
  products: DEFAULT_PRODUCTS,
  settings: DEFAULT_SETTINGS,
  alerts: [],
};

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadStore(): StoreData {
  try {
    ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content) as StoreData;
      inMemoryStore = {
        products: Array.isArray(parsed.products) ? parsed.products : DEFAULT_PRODUCTS,
        settings: {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings || {}),
          // prioritize env vars if present
          telegramToken: process.env.TELEGRAM_TOKEN || parsed.settings?.telegramToken || '',
          telegramChatId: process.env.TELEGRAM_CHAT_ID || parsed.settings?.telegramChatId || '',
          botUsername: parsed.settings?.botUsername || 'abisundar_bot',
        },
        alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
      };
      // update computed flags
      inMemoryStore.settings.hasTokenConfigured = Boolean(inMemoryStore.settings.telegramToken);
      inMemoryStore.settings.hasChatIdConfigured = Boolean(inMemoryStore.settings.telegramChatId);
      return inMemoryStore;
    }
  } catch (err) {
    console.error('[Store] Failed to load data file, using defaults:', err);
  }

  saveStore(inMemoryStore);
  return inMemoryStore;
}

export function saveStore(data: StoreData): void {
  try {
    ensureDataDir();
    inMemoryStore = data;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Store] Failed to save data file:', err);
  }
}

export function getProducts(): TrackedProduct[] {
  return inMemoryStore.products;
}

export function getProductById(id: string): TrackedProduct | undefined {
  return inMemoryStore.products.find((p) => p.id === id);
}

export function addProduct(product: TrackedProduct): void {
  // Check if product with same handle or ID already exists
  const existingIdx = inMemoryStore.products.findIndex(
    (p) => p.id === product.id || p.handle === product.handle
  );
  if (existingIdx >= 0) {
    inMemoryStore.products[existingIdx] = product;
  } else {
    inMemoryStore.products.unshift(product);
  }
  saveStore(inMemoryStore);
}

export function updateProduct(id: string, updates: Partial<TrackedProduct>): TrackedProduct | null {
  const idx = inMemoryStore.products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  inMemoryStore.products[idx] = {
    ...inMemoryStore.products[idx],
    ...updates,
  };
  saveStore(inMemoryStore);
  return inMemoryStore.products[idx];
}

export function deleteProduct(id: string): boolean {
  const prevLen = inMemoryStore.products.length;
  inMemoryStore.products = inMemoryStore.products.filter((p) => p.id !== id);
  if (inMemoryStore.products.length !== prevLen) {
    saveStore(inMemoryStore);
    return true;
  }
  return false;
}

export function getSettings(): TrackerSettings {
  return {
    ...inMemoryStore.settings,
    hasTokenConfigured: Boolean(inMemoryStore.settings.telegramToken),
    hasChatIdConfigured: Boolean(inMemoryStore.settings.telegramChatId),
  };
}

export function updateSettings(updates: Partial<TrackerSettings>): TrackerSettings {
  inMemoryStore.settings = {
    ...inMemoryStore.settings,
    ...updates,
  };
  inMemoryStore.settings.hasTokenConfigured = Boolean(inMemoryStore.settings.telegramToken);
  inMemoryStore.settings.hasChatIdConfigured = Boolean(inMemoryStore.settings.telegramChatId);
  saveStore(inMemoryStore);
  return inMemoryStore.settings;
}

export function getAlerts(): AlertLog[] {
  return inMemoryStore.alerts.slice(0, 50);
}

export function addAlertLog(alert: AlertLog): void {
  inMemoryStore.alerts.unshift(alert);
  if (inMemoryStore.alerts.length > 100) {
    inMemoryStore.alerts = inMemoryStore.alerts.slice(0, 100);
  }
  saveStore(inMemoryStore);
}

export function clearAlerts(): void {
  inMemoryStore.alerts = [];
  saveStore(inMemoryStore);
}

// Initial store hydration
loadStore();
