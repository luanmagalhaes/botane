export type Partner =
  | "de_bijenkorf"
  | "westwing"
  | "royal_design"
  | "gant"
  | "unknown";

export type EmailType =
  | "new_order"
  | "tracking_request"
  | "complaint"
  | "backorder"
  | "unknown";

export type AgentName =
  | "inbox_reader"
  | "classifier"
  | "partner_router"
  | "po_parser"
  | "stock_checker"
  | "order_builder"
  | "notifier";

export interface EmailAttachment {
  name: string;
  content: string;
}

export interface MockEmail {
  id: string;
  from: string;
  subject: string;
  body: string;
  date: string;
  partner: Partner;
  type: EmailType;
  attachment?: EmailAttachment;
}

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  currency: string;
}

export interface StockInfo {
  sku: string;
  available: number;
  restock_date?: string;
}

export interface ParsedOrder {
  po_number: string;
  partner: Partner;
  currency: string;
  delivery_date: string;
  items: OrderItem[];
  total: number;
}

export interface ShopifyDraftItem extends OrderItem {
  in_stock: boolean;
  available: number;
  restock_date?: string;
}

export interface ShopifyDraft {
  draft_id: string;
  partner: string;
  po_number: string;
  items: ShopifyDraftItem[];
  items_in_stock: ShopifyDraftItem[];
  items_oos: ShopifyDraftItem[];
  total: number;
  currency: string;
  verified: boolean;
  created_at: string;
}

export interface SSEEvent {
  type:
    | "agent_start"
    | "agent_log"
    | "agent_done"
    | "message_chunk"
    | "message_done"
    | "error";
  agent?: string;
  content?: string;
}

export type SSEEmitter = (event: SSEEvent) => void;
