import {
  getProductById,
  getProducts,
  updateProduct,
  getSettings,
  addAlertLog,
} from './store.ts';
import { scrapeCubeleloProduct } from './scraper.ts';
import {
  sendTelegramMessage,
  formatPriceDropMessage,
  formatStockAlertMessage,
} from './telegram.ts';
import { TrackedProduct } from '../src/types.ts';

let checkIntervalHandle: NodeJS.Timeout | null = null;
let isCheckingAll = false;

export async function checkSingleProduct(
  productId: string,
  options: { forceAlert?: boolean; forceAlertBelowTarget?: boolean; isManual?: boolean } = {}
): Promise<{
  product: TrackedProduct;
  alertSent: boolean;
  alertError?: string;
}> {
  const product = getProductById(productId);
  if (!product) {
    throw new Error(`Product with ID "${productId}" not found.`);
  }

  const settings = getSettings();
  let alertSent = false;
  let alertError: string | undefined;

  try {
    const scraped = await scrapeCubeleloProduct(product.url, product.selectedVariantId);

    const prevPrice = product.currentPrice;
    const prevInStock = product.inStock;
    const nowIso = new Date().toISOString();

    const selectedVariant =
      scraped.variants.find((v) => v.id === product.selectedVariantId) ||
      scraped.selectedVariant;

    const newPrice = selectedVariant.price;
    const newInStock = selectedVariant.available;
    const originalPrice = selectedVariant.compareAtPrice || scraped.originalPrice;

    // Determine status
    let status: 'ok' | 'price_drop' | 'out_of_stock' | 'error' = 'ok';
    if (!newInStock) {
      status = 'out_of_stock';
    } else if (newPrice <= product.targetPrice) {
      status = 'price_drop';
    }

    // Append to price history
    const updatedHistory = [...(product.priceHistory || [])];
    const lastHist = updatedHistory[updatedHistory.length - 1];
    if (!lastHist || lastHist.price !== newPrice || lastHist.inStock !== newInStock) {
      updatedHistory.push({
        timestamp: nowIso,
        price: newPrice,
        inStock: newInStock,
      });
      // keep max 30 price points
      if (updatedHistory.length > 30) {
        updatedHistory.shift();
      }
    }

    // Evaluate alert triggers
    const priceDroppedBelowTarget = newPrice <= product.targetPrice && newInStock;
    const isPriceChanged = newPrice < prevPrice;
    const becameInStock = !prevInStock && newInStock;

    // Check if we should send Telegram notification
    const canSend = settings.hasTokenConfigured && settings.hasChatIdConfigured;
    const isManualOrForced = Boolean(options.forceAlert || options.forceAlertBelowTarget || options.isManual);

    // Trigger alert if:
    // 1. Force alert requested (manual button test)
    // 2. Or notifications enabled for product:
    //    - If currently below target price:
    //        * Always send when manually checked or "Check All" clicked
    //        * On background cron: send if first time or price dropped further
    //    - If became in stock and notifyOnStock is enabled
    const shouldAlert =
      options.forceAlert ||
      (product.alertEnabled !== false &&
        ((priceDroppedBelowTarget &&
          (options.forceAlertBelowTarget ||
            options.isManual ||
            !product.lastAlertSentAt ||
            isPriceChanged)) ||
          (becameInStock && settings.notifyOnStock)));

    if (shouldAlert) {
      if (canSend) {
        let msg = '';
        let alertType: 'price_drop' | 'in_stock' = 'price_drop';

        if (becameInStock && !priceDroppedBelowTarget) {
          alertType = 'in_stock';
          msg = formatStockAlertMessage({
            title: product.title,
            variantTitle: selectedVariant.title,
            currentPrice: newPrice,
            url: product.url,
            botUsername: settings.botUsername,
          });
        } else {
          msg = formatPriceDropMessage({
            title: product.title,
            variantTitle: selectedVariant.title,
            currentPrice: newPrice,
            targetPrice: product.targetPrice,
            originalPrice,
            url: product.url,
            botUsername: settings.botUsername,
            isManualTrigger: isManualOrForced,
          });
        }

        const telegramRes = await sendTelegramMessage({
          token: settings.telegramToken,
          chatId: settings.telegramChatId,
          text: msg,
        });

        if (telegramRes.success) {
          alertSent = true;
          addAlertLog({
            id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: nowIso,
            productId: product.id,
            productTitle: product.title,
            currentPrice: newPrice,
            targetPrice: product.targetPrice,
            variantTitle: selectedVariant.title,
            type: alertType,
            success: true,
            messageText: msg,
          });
        } else {
          alertError = telegramRes.error;
          addAlertLog({
            id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: nowIso,
            productId: product.id,
            productTitle: product.title,
            currentPrice: newPrice,
            targetPrice: product.targetPrice,
            variantTitle: selectedVariant.title,
            type: alertType,
            success: false,
            error: telegramRes.error,
            messageText: msg,
          });
        }
      } else {
        alertError = 'Telegram bot token or Chat ID not configured.';
      }
    }

    const updated = updateProduct(productId, {
      title: scraped.title,
      vendor: scraped.vendor,
      imageUrl: scraped.imageUrl || product.imageUrl,
      variants: scraped.variants,
      selectedVariantId: selectedVariant.id,
      selectedVariantTitle: selectedVariant.title,
      currentPrice: newPrice,
      originalPrice,
      inStock: newInStock,
      lastChecked: nowIso,
      lastStatus: status,
      lastErrorMessage: undefined,
      lastAlertSentAt: alertSent ? nowIso : product.lastAlertSentAt,
      priceHistory: updatedHistory,
    });

    return {
      product: updated || product,
      alertSent,
      alertError,
    };
  } catch (err: any) {
    const errorMsg = err.message || 'Scraping error';
    const updated = updateProduct(productId, {
      lastChecked: new Date().toISOString(),
      lastStatus: 'error',
      lastErrorMessage: errorMsg,
    });

    return {
      product: updated || product,
      alertSent: false,
      alertError: errorMsg,
    };
  }
}

export async function checkAllProducts(
  options: { forceAlertBelowTarget?: boolean; isManual?: boolean } = {
    forceAlertBelowTarget: true,
    isManual: true,
  }
): Promise<{
  checkedCount: number;
  alertsSent: number;
  errors: Array<{ id: string; error: string }>;
}> {
  if (isCheckingAll) {
    return { checkedCount: 0, alertsSent: 0, errors: [] };
  }

  isCheckingAll = true;
  const products = getProducts();
  let alertsSent = 0;
  const errors: Array<{ id: string; error: string }> = [];

  try {
    for (const prod of products) {
      try {
        const res = await checkSingleProduct(prod.id, {
          forceAlertBelowTarget: options.forceAlertBelowTarget !== false,
          isManual: options.isManual !== false,
        });
        if (res.alertSent) alertsSent++;
        if (res.alertError && !res.alertSent) {
          errors.push({ id: prod.id, error: res.alertError });
        }
        // Small 400ms delay between requests to be respectful to Cubelelo's servers
        await new Promise((r) => setTimeout(r, 400));
      } catch (e: any) {
        errors.push({ id: prod.id, error: e.message || String(e) });
      }
    }
  } finally {
    isCheckingAll = false;
  }

  return {
    checkedCount: products.length,
    alertsSent,
    errors,
  };
}

export function setupBackgroundChecker(): void {
  if (checkIntervalHandle) {
    clearInterval(checkIntervalHandle);
    checkIntervalHandle = null;
  }

  const settings = getSettings();
  if (!settings.autoCheckEnabled) {
    console.log('[Checker] Automated background checks are disabled.');
    return;
  }

  const intervalMs = Math.max(1, settings.checkIntervalMinutes) * 60 * 1000;
  console.log(`[Checker] Scheduling background check every ${settings.checkIntervalMinutes} minutes.`);

  checkIntervalHandle = setInterval(() => {
    console.log('[Checker] Triggering scheduled background check of all products...');
    checkAllProducts({ forceAlertBelowTarget: false, isManual: false }).catch((err) => {
      console.error('[Checker] Background check failed:', err);
    });
  }, intervalMs);
}
