import type { ShopifyDraftItem } from "../botane/types.js";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = "2024-10";

export interface VariantInfo {
  variantId: string;
  inventoryQuantity: number;
}

const variantCache = new Map<string, VariantInfo | null>();

export function resetVariantCache(): void {
  variantCache.clear();
}

async function shopifyGraphQL<T = any>(query: string): Promise<T> {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
    throw new Error("Shopify credentials missing. Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN.");
  }

  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query }),
    }
  );

  const data = await response.json();
  if (data.errors) {
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(data.errors)}`);
  }
  return data.data;
}

/**
 * Look up a product variant by SKU. Returns the variant ID (numeric, from the GID) and
 * the current inventory quantity. Results are cached per session so multiple tools
 * hitting the same SKUs do not trigger duplicate API calls.
 */
export async function getVariantBySku(sku: string): Promise<VariantInfo | null> {
  if (variantCache.has(sku)) {
    return variantCache.get(sku)!;
  }

  const query = `
    {
      productVariants(first: 1, query: "sku:'${sku.replace(/'/g, "\\'")}'") {
        edges {
          node {
            id
            inventoryQuantity
          }
        }
      }
    }
  `;

  try {
    const data = await shopifyGraphQL<{ productVariants: { edges: Array<{ node: { id: string; inventoryQuantity: number | null } }> } }>(query);
    const edges = data?.productVariants?.edges ?? [];
    if (edges.length === 0) {
      variantCache.set(sku, null);
      return null;
    }

    const node = edges[0].node;
    const numericId = node.id.split("/").pop() ?? "";
    const info: VariantInfo = {
      variantId: numericId,
      inventoryQuantity: node.inventoryQuantity ?? 0,
    };
    variantCache.set(sku, info);
    return info;
  } catch {
    variantCache.set(sku, null);
    return null;
  }
}

export async function createShopifyDraftOrder(
  items: ShopifyDraftItem[],
  partner: string
): Promise<
  | { success: true; draftOrderId: number; invoiceUrl: string }
  | { success: false; error: string }
> {
  if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_STORE_DOMAIN) {
    return {
      success: false,
      error: "Shopify credentials missing. Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN.",
    };
  }

  const lineItems: Array<{ variant_id: number; quantity: number; price: string }> = [];
  const notFoundSkus: string[] = [];

  for (const item of items) {
    const variant = await getVariantBySku(item.sku);
    if (!variant) {
      notFoundSkus.push(item.sku);
    } else {
      lineItems.push({
        variant_id: parseInt(variant.variantId, 10),
        quantity: item.quantity,
        price: item.unit_price.toString(),
      });
    }
  }

  if (notFoundSkus.length > 0) {
    return {
      success: false,
      error: `The following SKUs were not found in Shopify: ${notFoundSkus.join(", ")}. Please alert the user.`,
    };
  }

  const payload = {
    draft_order: {
      line_items: lineItems,
      tags: `B2B, Agent, ${partner}`,
      note: `B2B order imported automatically by the agent. Partner: ${partner}`,
    },
  };

  try {
    const response = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/draft_orders.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: `Shopify API error: ${JSON.stringify(data.errors || data)}`,
      };
    }

    return {
      success: true,
      draftOrderId: data.draft_order.id,
      invoiceUrl: data.draft_order.invoice_url,
    };
  } catch (err) {
    return {
      success: false,
      error: `Shopify API request failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
