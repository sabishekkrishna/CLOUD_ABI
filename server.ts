import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  getSettings,
  updateSettings,
  getAlerts,
  clearAlerts,
  addAlertLog,
} from './server/store.ts';
import { scrapeCubeleloProduct } from './server/scraper.ts';
import {
  checkSingleProduct,
  checkAllProducts,
  setupBackgroundChecker,
} from './server/checker.ts';
import {
  sendTelegramMessage,
  formatTestMessage,
} from './server/telegram.ts';
import { TrackedProduct } from './src/types.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'cubelelo-tracker',
      timestamp: new Date().toISOString(),
    });
  });

  // Overview status
  app.get('/api/status', (req, res) => {
    const products = getProducts();
    const settings = getSettings();
    const alerts = getAlerts();

    const activeAlertsCount = products.filter((p) => p.alertEnabled).length;
    const belowTargetCount = products.filter(
      (p) => p.inStock && p.currentPrice <= p.targetPrice
    ).length;

    res.json({
      totalTracked: products.length,
      activeAlertsCount,
      belowTargetCount,
      totalAlertsSent: alerts.filter((a) => a.success).length,
      botUsername: settings.botUsername || 'abisundar_bot',
      hasTokenConfigured: settings.hasTokenConfigured,
      hasChatIdConfigured: settings.hasChatIdConfigured,
      checkIntervalMinutes: settings.checkIntervalMinutes,
      autoCheckEnabled: settings.autoCheckEnabled,
    });
  });

  // Products CRUD
  app.get('/api/products', (req, res) => {
    res.json(getProducts());
  });

  // Scrape preview endpoint before adding
  app.post('/api/products/preview', async (req, res) => {
    try {
      const { url, variantId } = req.body;
      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'Valid Cubelelo URL or handle is required.' });
        return;
      }
      const data = await scrapeCubeleloProduct(url, variantId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to preview product.' });
    }
  });

  // Add new product to tracking
  app.post('/api/products', async (req, res) => {
    try {
      const { url, targetPrice, selectedVariantId, alertEnabled } = req.body;
      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'Cubelelo URL is required.' });
        return;
      }

      // Scrape real-time details from Cubelelo
      const scraped = await scrapeCubeleloProduct(url, selectedVariantId);
      const chosenVariant =
        scraped.variants.find((v) => v.id === selectedVariantId) ||
        scraped.selectedVariant;

      const parsedTarget =
        parseFloat(targetPrice) || chosenVariant.price || scraped.currentPrice;

      const newProduct: TrackedProduct = {
        id: `prod-${scraped.handle}-${Date.now()}`,
        url: scraped.url,
        handle: scraped.handle,
        title: scraped.title,
        vendor: scraped.vendor,
        productType: scraped.productType,
        imageUrl: scraped.imageUrl,
        selectedVariantId: chosenVariant.id,
        selectedVariantTitle: chosenVariant.title,
        variants: scraped.variants,
        currentPrice: chosenVariant.price,
        originalPrice: chosenVariant.compareAtPrice || scraped.originalPrice,
        targetPrice: parsedTarget,
        inStock: chosenVariant.available,
        alertEnabled: alertEnabled !== undefined ? Boolean(alertEnabled) : true,
        lastChecked: new Date().toISOString(),
        lastStatus:
          !chosenVariant.available
            ? 'out_of_stock'
            : chosenVariant.price <= parsedTarget
            ? 'price_drop'
            : 'ok',
        priceHistory: [
          {
            timestamp: new Date().toISOString(),
            price: chosenVariant.price,
            inStock: chosenVariant.available,
          },
        ],
        createdAt: new Date().toISOString(),
      };

      addProduct(newProduct);
      res.status(201).json(newProduct);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to add product.' });
    }
  });

  // Update existing product (target price, variant, alertEnabled)
  app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { targetPrice, alertEnabled, selectedVariantId } = req.body;

    const existing = getProductById(id);
    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const updates: Partial<TrackedProduct> = {};
    if (targetPrice !== undefined) {
      const num = parseFloat(targetPrice);
      if (!isNaN(num)) {
        updates.targetPrice = num;
        if (existing.inStock && existing.currentPrice <= num) {
          updates.lastStatus = 'price_drop';
          if (num !== existing.targetPrice) {
            updates.lastAlertSentAt = undefined;
          }
        } else if (existing.inStock) {
          updates.lastStatus = 'ok';
        }
      }
    }
    if (alertEnabled !== undefined) {
      updates.alertEnabled = Boolean(alertEnabled);
    }
    if (selectedVariantId !== undefined) {
      const foundVar = existing.variants.find((v) => v.id === selectedVariantId);
      if (foundVar) {
        updates.selectedVariantId = foundVar.id;
        updates.selectedVariantTitle = foundVar.title;
        updates.currentPrice = foundVar.price;
        updates.originalPrice = foundVar.compareAtPrice;
        updates.inStock = foundVar.available;
      }
    }

    const updated = updateProduct(id, updates);
    res.json(updated);
  });

  // Delete product
  app.delete('/api/products/:id', (req, res) => {
    const success = deleteProduct(req.params.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Product not found.' });
    }
  });

  // Check single product now
  app.post('/api/products/:id/check', async (req, res) => {
    try {
      const { forceAlert, forceAlertBelowTarget } = req.body || {};
      const result = await checkSingleProduct(req.params.id, {
        forceAlert: Boolean(forceAlert),
        forceAlertBelowTarget: forceAlertBelowTarget !== false,
        isManual: true,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Check failed.' });
    }
  });

  // Check all products now
  app.post('/api/products/check-all', async (req, res) => {
    try {
      const { forceAlertBelowTarget } = req.body || {};
      const result = await checkAllProducts({
        forceAlertBelowTarget: forceAlertBelowTarget !== false,
        isManual: true,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Check all failed.' });
    }
  });

  // Settings
  app.get('/api/settings', (req, res) => {
    const settings = getSettings();
    // Mask token for safe UI viewing
    const maskedToken = settings.telegramToken
      ? `${settings.telegramToken.slice(0, 4)}...${settings.telegramToken.slice(-4)}`
      : '';
    res.json({
      ...settings,
      maskedToken,
    });
  });

  app.post('/api/settings', (req, res) => {
    const {
      telegramToken,
      telegramChatId,
      botUsername,
      checkIntervalMinutes,
      autoCheckEnabled,
      notifyOnStock,
    } = req.body;

    const updates: any = {};
    if (telegramToken !== undefined) updates.telegramToken = telegramToken.trim();
    if (telegramChatId !== undefined) updates.telegramChatId = telegramChatId.trim();
    if (botUsername !== undefined) updates.botUsername = botUsername.trim();
    if (checkIntervalMinutes !== undefined) {
      updates.checkIntervalMinutes = Math.max(1, parseInt(checkIntervalMinutes, 10) || 30);
    }
    if (autoCheckEnabled !== undefined) updates.autoCheckEnabled = Boolean(autoCheckEnabled);
    if (notifyOnStock !== undefined) updates.notifyOnStock = Boolean(notifyOnStock);

    const updated = updateSettings(updates);
    setupBackgroundChecker();

    res.json({
      ...updated,
      maskedToken: updated.telegramToken
        ? `${updated.telegramToken.slice(0, 4)}...${updated.telegramToken.slice(-4)}`
        : '',
    });
  });

  // Send Test Alert to Telegram
  app.post('/api/telegram/test', async (req, res) => {
    try {
      const settings = getSettings();
      const token = req.body.token || settings.telegramToken;
      const chatId = req.body.chatId || settings.telegramChatId;
      const botUsername = req.body.botUsername || settings.botUsername || 'abisundar_bot';

      if (!token || !chatId) {
        res.status(400).json({
          error: 'Please configure Telegram Token and Chat ID to send test message.',
        });
        return;
      }

      const testMsg = formatTestMessage(botUsername);
      const result = await sendTelegramMessage({
        token,
        chatId,
        text: testMsg,
      });

      if (result.success) {
        addAlertLog({
          id: `test-${Date.now()}`,
          timestamp: new Date().toISOString(),
          productId: 'test',
          productTitle: 'Connection Test Notification',
          currentPrice: 0,
          targetPrice: 0,
          type: 'test',
          success: true,
          messageText: testMsg,
        });
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to send test message.' });
    }
  });

  // Alerts log
  app.get('/api/alerts', (req, res) => {
    res.json(getAlerts());
  });

  app.delete('/api/alerts', (req, res) => {
    clearAlerts();
    res.json({ success: true });
  });

  // Start background periodic checker
  setupBackgroundChecker();

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Cubelelo Tracker running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
