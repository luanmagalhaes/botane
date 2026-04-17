import type { ShopifyDraftItem } from "../botane/types.js";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;
const API_VERSION = "2026-04";

/**
 * Procura um produto no Shopify pelo SKU (via GraphQL) para obter o Variant ID real.
 * O Shopify Draft Order API exige o variant_id para vincular os produtos corretamente,
 * senão acabaria criando "custom line items" desconectados do estoque.
 */
async function getVariantIdBySku(sku: string): Promise<string | null> {
  const query = `
    {
      productVariants(first: 1, query: "sku:'${sku}'") {
        edges {
          node {
            id
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error("Shopify GraphQL Error:", data.errors);
      return null;
    }

    const edges = data?.data?.productVariants?.edges || [];
    if (edges.length === 0) return null;

    // GraphQL retorna GIDs no formato: "gid://shopify/ProductVariant/123456"
    const gid = edges[0].node.id;
    return gid.split("/").pop() || null;
  } catch (error) {
    console.error("Failed to fetch variant by SKU:", error);
    return null;
  }
}

/**
 * Mapeia os itens em estoque gerados pelo customParser e cria a Draft Order.
 * Informa erro caso os SKUs solicitados não existam na base.
 */
export async function createShopifyDraftOrder(items: ShopifyDraftItem[], partner: string) {
  if (!SHOPIFY_ACCESS_TOKEN) {
    throw new Error("SHOPIFY_ACCESS_TOKEN não está configurado. Verifique as variáveis de ambiente.");
  }

  const lineItems = [];
  const notFoundSkus: string[] = [];

  // Mapeamento: Busca o variant_id real de cada item extraído do PDF
  for (const item of items) {
    const variantId = await getVariantIdBySku(item.sku);

    if (!variantId) {
      notFoundSkus.push(item.sku);
    } else {
      lineItems.push({
        variant_id: parseInt(variantId, 10),
        quantity: item.quantity,
        price: item.unit_price.toString(), // Sobrescreve pelo valor B2B retornado no parser!
      });
    }
  }

  // Validação: Se algum SKU não existir na loja, interrompemos e alertamos o agente!
  if (notFoundSkus.length > 0) {
    return {
      success: false,
      error: `Os seguintes SKUs não foram encontrados no Shopify: ${notFoundSkus.join(", ")}. Por favor, alerte o usuário.`,
    };
  }

  const payload = {
    draft_order: {
      line_items: lineItems,
      tags: `B2B, Agent, ${partner}`,
      note: `B2B Order importada automaticamente pelo Agente. Cliente: ${partner}`,
    },
  };

  try {
    // Criação: POST via REST API
    const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/draft_orders.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: `Shopify API Error: ${JSON.stringify(data.errors || data)}`,
      };
    }

    return {
      success: true,
      draftOrderId: data.draft_order.id,
      invoiceUrl: data.draft_order.invoice_url,
    };
  } catch (error) {
    return {
      success: false,
      error: `Falha na comunicação com a API do Shopify: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
