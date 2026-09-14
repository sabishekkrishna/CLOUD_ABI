import { ScrapedProductData, ProductVariant } from '../src/types.ts';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export function extractHandleAndVariant(inputUrl: string): { handle: string; variantId?: number } {
  let clean = inputUrl.trim();
  let variantId: number | undefined;

  // Check if variant query exists
  try {
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      const parsedUrl = new URL(clean);
      const varParam = parsedUrl.searchParams.get('variant');
      if (varParam) {
        const parsedVar = parseInt(varParam, 10);
        if (!isNaN(parsedVar)) variantId = parsedVar;
      }
      clean = parsedUrl.pathname;
    }
  } catch {
    // Continue with string parsing
  }

  // Extract handle from path
  const match = clean.match(/\/products\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return { handle: match[1].replace(/\.json$/, ''), variantId };
  }

  // If user entered raw handle or slug
  const slug = clean.replace(/^\/+|\/+$/g, '').replace(/\.json$/, '');
  return { handle: slug, variantId };
}

export async function scrapeCubeleloProduct(
  input: string,
  preferredVariantId?: number
): Promise<ScrapedProductData> {
  const { handle, variantId: urlVariantId } = extractHandleAndVariant(input);
  const targetVariantId = preferredVariantId || urlVariantId;
  const canonicalUrl = `https://www.cubelelo.com/products/${handle}`;

  // Method 1: Direct Shopify JSON API (Primary, fast & detailed technique as used in GitHub repo)
  try {
    const jsonUrl = `https://www.cubelelo.com/products/${handle}.json`;
    const res = await fetch(jsonUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        product?: {
          id: number;
          title: string;
          vendor?: string;
          product_type?: string;
          handle: string;
          variants: Array<{
            id: number;
            title: string;
            price: string;
            compare_at_price: string | null;
            available?: boolean;
            sku?: string;
          }>;
          images?: Array<{ id: number; src: string; alt: string | null }>;
          image?: { src: string };
        };
      };

      if (data.product && Array.isArray(data.product.variants) && data.product.variants.length > 0) {
        const prod = data.product;
        const variants: ProductVariant[] = prod.variants.map((v) => {
          const price = parseFloat(v.price) || 0;
          const compareAtPrice = v.compare_at_price ? parseFloat(v.compare_at_price) : null;
          // In Shopify JSON, if available is boolean use it, else consider in-stock if price > 0
          const available = v.available !== undefined ? Boolean(v.available) : true;
          return {
            id: v.id,
            title: v.title === 'Default Title' ? 'Standard' : v.title,
            price,
            compareAtPrice,
            available,
            sku: v.sku || '',
          };
        });

        // Pick selected variant
        let selected = variants.find((v) => v.id === targetVariantId);
        if (!selected) {
          selected = variants[0];
        }

        let imageUrl = prod.image?.src || (prod.images && prod.images[0]?.src) || '';
        if (imageUrl.startsWith('//')) {
          imageUrl = `https:${imageUrl}`;
        }

        return {
          title: prod.title,
          vendor: prod.vendor || 'Cubelelo',
          productType: prod.product_type || 'Cube',
          handle: prod.handle || handle,
          url: canonicalUrl,
          imageUrl,
          variants,
          selectedVariant: selected,
          currentPrice: selected.price,
          originalPrice: selected.compareAtPrice,
          inStock: selected.available,
          methodUsed: 'shopify_json',
        };
      }
    }
  } catch (error) {
    console.warn(`[Scraper] JSON API fetch failed for ${handle}, attempting HTML fallback:`, error);
  }

  // Method 2: HTML Meta Tag Parsing (Fallback technique as used in GitHub repo)
  try {
    const htmlRes = await fetch(canonicalUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!htmlRes.ok) {
      throw new Error(`HTTP status ${htmlRes.status} received from Cubelelo`);
    }

    const html = await htmlRes.text();

    // Extract price from meta tag: og:price:amount or product:price:amount
    let price: number | null = null;
    const priceMetaMatch = html.match(/<meta[^>]+(?:property|name)=["'](?:og|product):price:amount["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og|product):price:amount["']/i);
    
    if (priceMetaMatch && priceMetaMatch[1]) {
      price = parseFloat(priceMetaMatch[1]);
    }

    // Secondary price regex fallback
    if (!price || isNaN(price)) {
      const priceRegex = /["']price["']\s*:\s*["']?(\d+(?:\.\d+)?)["']?/i;
      const jsonMatch = html.match(priceRegex);
      if (jsonMatch && jsonMatch[1]) {
        price = parseFloat(jsonMatch[1]);
      }
    }

    if (!price || isNaN(price)) {
      throw new Error('Unable to extract price from Cubelelo product page HTML');
    }

    // Extract title
    let title = handle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].replace(/\s*–\s*Cubelelo.*$/i, '').trim();
    }

    // Extract image
    let imageUrl = '';
    const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      imageUrl = imgMatch[1];
      if (imageUrl.startsWith('//')) imageUrl = `https:${imageUrl}`;
    }

    // Stock check
    const isSoldOut = /sold[\s_-]?out|out[\s_-]?of[\s_-]?stock/i.test(html) && !/in[\s_-]?stock/i.test(html);

    const fallbackVariant: ProductVariant = {
      id: targetVariantId || 1,
      title: 'Standard',
      price,
      compareAtPrice: null,
      available: !isSoldOut,
    };

    return {
      title,
      vendor: 'Cubelelo',
      productType: 'Speedcube',
      handle,
      url: canonicalUrl,
      imageUrl,
      variants: [fallbackVariant],
      selectedVariant: fallbackVariant,
      currentPrice: price,
      originalPrice: null,
      inStock: !isSoldOut,
      methodUsed: 'html_fallback',
    };
  } catch (err: any) {
    throw new Error(`Failed to scrape product "${handle}": ${err.message || String(err)}`);
  }
}
