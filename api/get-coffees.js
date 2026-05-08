const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cache 5 minutes at the CDN layer — inventory doesn't change faster than this
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  const { SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, SHOPIFY_STORE_HANDLE } = process.env;

  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET || !SHOPIFY_STORE_HANDLE) {
    return res.status(500).json({ error: 'Missing Shopify env vars' });
  }

  try {
    // 1. Client credentials token exchange
    const tokenRes = await fetch(
      `https://${SHOPIFY_STORE_HANDLE}.myshopify.com/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: SHOPIFY_CLIENT_ID,
          client_secret: SHOPIFY_CLIENT_SECRET,
        }),
      }
    );

    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      return res.status(502).json({ error: 'Shopify token exchange failed', detail });
    }

    const { access_token } = await tokenRes.json();

    const baseUrl = `https://${SHOPIFY_STORE_HANDLE}.myshopify.com/admin/api/2025-01`;
    const shopHeaders = { 'X-Shopify-Access-Token': access_token };

    // 2. Fetch all active products, paginating via Link header
    const allProducts = [];
    let nextUrl = `${baseUrl}/products.json?status=active&limit=250`;

    while (nextUrl) {
      const r = await fetch(nextUrl, { headers: shopHeaders });
      if (!r.ok) {
        const detail = await r.text();
        return res.status(502).json({ error: 'Shopify products fetch failed', detail });
      }
      const body = await r.json();
      allProducts.push(...(body.products || []));

      const link = r.headers.get('link') || '';
      const m = link.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = m ? m[1] : null;
    }

    // 3. Filter to Torque Coffees vendor (exact match)
    const torqueProducts = allProducts.filter(p => p.vendor === 'Torque Coffees');

    // 4. Fetch metafields for each product in parallel
    const coffees = await Promise.all(
      torqueProducts.map(async (product) => {
        const mRes = await fetch(
          `${baseUrl}/products/${product.id}/metafields.json?namespace=custom`,
          { headers: shopHeaders }
        );
        const { metafields } = await mRes.json();
        const meta = {};
        (metafields || []).forEach(m => { meta[m.key] = m.value; });

        // In-stock: any variant that has no inventory tracking, positive qty, or allow-oversell policy
        const inStock = product.variants.some(v =>
          v.inventory_management === null ||
          v.inventory_quantity > 0 ||
          v.inventory_policy === 'continue'
        );

        const rawX = meta['torque_compass_x'];
        const rawY = meta['torque_compass_y'];
        const qx = rawX !== undefined ? parseInt(rawX, 10) : null;
        const qy = rawY !== undefined ? parseInt(rawY, 10) : null;

        return {
          name: product.title,
          handle: product.handle,
          image_url: product.images && product.images[0] ? product.images[0].src : null,
          quadrant_x: (qx !== null && !isNaN(qx)) ? qx : null,
          quadrant_y: (qy !== null && !isNaN(qy)) ? qy : null,
          feeling_pair: meta['quadrant_profile'] || null,
          tasting_notes: meta['3_flavors'] || null,
          product_url: `https://torque.coffee/products/${product.handle}?utm_source=palate_passport&utm_medium=pwa&utm_campaign=v0`,
          in_stock: inStock,
          created_at: product.created_at,
        };
      })
    );

    // Return only coffees with complete quadrant data AND in stock
    const ready = coffees.filter(c => c.in_stock && c.quadrant_x !== null && c.quadrant_y !== null);

    res.status(200).json(ready);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
