export interface TelegramMessageOptions {
  token: string;
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

/**
 * Escapes characters for Telegram HTML parse_mode
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strips HTML tags for plaintext fallback
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '');
}

export async function sendTelegramMessage(options: TelegramMessageOptions): Promise<{
  success: boolean;
  messageId?: number;
  error?: string;
  status?: number;
}> {
  const { token, chatId, text, parseMode = 'HTML' } = options;

  if (!token || !chatId) {
    return {
      success: false,
      error: 'Telegram token or Chat ID is missing. Please configure credentials.',
    };
  }

  const cleanToken = token.trim();
  const cleanChatId = chatId.trim();

  try {
    const telegramUrl = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    
    // Attempt 1: Send with parse_mode (default HTML)
    let response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: false,
      }),
      signal: AbortSignal.timeout(10000),
    });

    let data = (await response.json()) as {
      ok: boolean;
      description?: string;
      result?: { message_id: number };
    };

    // If parse failed due to entity formatting, fallback to plain text without parse_mode
    if (!data.ok && data.description && /can't parse entities|tag/i.test(data.description)) {
      console.warn('Telegram parse_mode failed, retrying with plaintext:', data.description);
      const plainText = stripHtml(text);
      response = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: plainText,
          disable_web_page_preview: false,
        }),
        signal: AbortSignal.timeout(10000),
      });
      data = (await response.json()) as any;
    }

    if (response.ok && data.ok) {
      return {
        success: true,
        messageId: data.result?.message_id,
        status: response.status,
      };
    } else {
      return {
        success: false,
        error: data.description || `Telegram API Error (${response.status})`,
        status: response.status,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to connect to Telegram API servers.',
    };
  }
}

export function formatPriceDropMessage(params: {
  title: string;
  variantTitle?: string;
  currentPrice: number;
  targetPrice: number;
  originalPrice?: number | null;
  url: string;
  botUsername?: string;
  isManualTrigger?: boolean;
}): string {
  const {
    title,
    variantTitle,
    currentPrice,
    targetPrice,
    originalPrice,
    url,
    botUsername = 'abisundar_bot',
    isManualTrigger = false,
  } = params;

  const formattedCurrent = currentPrice.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
  const formattedTarget = targetPrice.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });

  let discountInfo = '';
  if (originalPrice && originalPrice > currentPrice) {
    const savings = originalPrice - currentPrice;
    const pct = Math.round((savings / originalPrice) * 100);
    discountInfo = `\n💰 <b>Discount:</b> ${pct}% OFF (M.R.P: ₹${originalPrice.toLocaleString('en-IN')})`;
  }

  const variantText =
    variantTitle && variantTitle !== 'Standard' && variantTitle !== 'Default Title'
      ? ` (${variantTitle})`
      : '';

  const cleanBotName = botUsername.replace(/^@/, '');
  const header = isManualTrigger
    ? '🚨 <b>CUBELELO SPEEDCUBE NOTIFICATION</b> 🧩'
    : '🚨 <b>PRICE DROP ALERT!</b> 🧩';

  return (
    `${header}\n\n` +
    `Item: <b>${escapeHtml(title)}${escapeHtml(variantText)}</b>\n` +
    `Current Price: <b>₹${formattedCurrent}</b>\n` +
    `Target Threshold: ₹${formattedTarget}${discountInfo}\n\n` +
    `🛒 <a href="${escapeHtml(url)}">Buy on Cubelelo</a>\n\n` +
    `<i>Notified via @${escapeHtml(cleanBotName)} tracker</i>`
  );
}

export function formatStockAlertMessage(params: {
  title: string;
  variantTitle?: string;
  currentPrice: number;
  url: string;
  botUsername?: string;
}): string {
  const { title, variantTitle, currentPrice, url, botUsername = 'abisundar_bot' } = params;
  const formattedCurrent = currentPrice.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
  const variantText =
    variantTitle && variantTitle !== 'Standard' && variantTitle !== 'Default Title'
      ? ` (${variantTitle})`
      : '';
  const cleanBotName = botUsername.replace(/^@/, '');

  return (
    `📦 <b>BACK IN STOCK ALERT!</b> ⚡\n\n` +
    `Item: <b>${escapeHtml(title)}${escapeHtml(variantText)}</b>\n` +
    `Price: <b>₹${formattedCurrent}</b>\n\n` +
    `⚡ Available now! <a href="${escapeHtml(url)}">Buy on Cubelelo</a>\n\n` +
    `<i>Notified via @${escapeHtml(cleanBotName)} tracker</i>`
  );
}

export function formatTestMessage(botUsername: string = 'abisundar_bot'): string {
  const cleanBotName = botUsername.replace(/^@/, '');
  return (
    `🔔 <b>TELEGRAM BOT CONNECTION VERIFIED!</b> ✅\n\n` +
    `Bot: <b>@${escapeHtml(cleanBotName)}</b>\n` +
    `Status: <b>Active & Connected</b>\n` +
    `Time: <code>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</code>\n\n` +
    `Your Cubelelo speedcube price tracking notifications are ready to receive real-time price drops and stock updates! 🚀`
  );
}
