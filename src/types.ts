export interface ProductVariant {
  id: number;
  title: string;
  price: number;
  compareAtPrice: number | null;
  available: boolean;
  sku?: string;
}

export interface PricePoint {
  timestamp: string;
  price: number;
  inStock: boolean;
}

export interface TrackedProduct {
  id: string;
  url: string;
  handle: string;
  title: string;
  vendor: string;
  productType: string;
  imageUrl: string;
  selectedVariantId: number;
  selectedVariantTitle: string;
  variants: ProductVariant[];
  currentPrice: number;
  originalPrice: number | null;
  targetPrice: number;
  inStock: boolean;
  alertEnabled: boolean;
  lastChecked: string;
  lastStatus: 'ok' | 'price_drop' | 'out_of_stock' | 'error';
  lastErrorMessage?: string;
  lastAlertSentAt?: string;
  priceHistory: PricePoint[];
  createdAt: string;
}

export interface TrackerSettings {
  telegramToken: string;
  telegramChatId: string;
  botUsername: string;
  checkIntervalMinutes: number;
  autoCheckEnabled: boolean;
  notifyOnStock: boolean;
  hasTokenConfigured: boolean;
  hasChatIdConfigured: boolean;
}

export interface AlertLog {
  id: string;
  timestamp: string;
  productId: string;
  productTitle: string;
  currentPrice: number;
  targetPrice: number;
  variantTitle?: string;
  type: 'price_drop' | 'in_stock' | 'test';
  success: boolean;
  error?: string;
  messageText: string;
}

export interface ScrapedProductData {
  title: string;
  vendor: string;
  productType: string;
  handle: string;
  url: string;
  imageUrl: string;
  variants: ProductVariant[];
  selectedVariant: ProductVariant;
  currentPrice: number;
  originalPrice: number | null;
  inStock: boolean;
  methodUsed: 'shopify_json' | 'html_fallback';
}
