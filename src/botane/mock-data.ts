import type { MockEmail, StockInfo, ParsedOrder } from "./types.js";

export const INBOX: MockEmail[] = [
  {
    id: "email_001",
    from: "logistics@debijenkorf.nl",
    subject: "Purchase Order 200936891 — Botané ApS",
    date: new Date().toISOString(),
    partner: "de_bijenkorf",
    type: "new_order",
    body: `Dear Botané team,

Please find attached our purchase order 200936891.

Delivery window: 15/04/2026 – 24/04/2026
Terms of delivery: DAP Tilburg
Currency: EUR

Please confirm receipt and expected delivery date.

Best regards,
De Bijenkorf Logistics
debijenkorflogistics.com`,
    attachment: {
      name: "PO_200936891_DeBijenkorf.pdf",
      content: `PURCHASE ORDER — De Bijenkorf
PO Number: 200936891
Date: 14/04/2026
Delivery: 15/04/2026 – 24/04/2026
Currency: EUR

LINE ITEMS:
1. Mini Rose Bouquet Dark Red | EAN: 5740034503164 | Qty: 8 | Unit: €16.00 | Total: €128.00
2. Mini Rose Bouquet Light Pink | EAN: 5740034502556 | Qty: 8 | Unit: €16.00 | Total: €128.00
3. Peony Bouquet Multicolor | EAN: 5740034503324 | Qty: 16 | Unit: €28.80 | Total: €460.80
4. Perfectly Plum Multicolor | EAN: 5740034513996 | Qty: 8 | Unit: €60.00 | Total: €480.00
5. Poppy Spritz Multicolor | EAN: 5740034502549 | Qty: 8 | Unit: €42.00 | Total: €336.00
6. Tulip Bouquet Orange | EAN: 5740034503096 | Qty: 16 | Unit: €21.20 | Total: €339.20

TOTAL: 64 units — EUR 1,872.00`,
    },
  },
  {
    id: "email_002",
    from: "allsupply@westwing.de",
    subject: "Westwing New Order — PO 3109V2QMS00D01",
    date: new Date().toISOString(),
    partner: "westwing",
    type: "new_order",
    body: `Hi Botané team,

Please find attached our new purchase order.

PO Number: 3109V2QMS00D01
Delivery date: 22.04.2026
Payment terms: 45 days net from invoice date
Return discount: 2%

Please send invoice to: supplierinvoices.shop@westwing.de

Best,
Westwing Supply Team`,
    attachment: {
      name: "order_DE26BNY01_Botan_ApS_3109V2QMS00D01.pdf",
      content: `WESTWING PURCHASE ORDER
PO Number: 3109V2QMS00D01
Delivery: 22.04.2026
Currency: EUR

LINE ITEMS (selected):
1. Pink Triumph Tulip Bouquet | SKU: BOTBOU160 | Qty: 26 | Unit: €24.40 | Total: €634.40
2. Purple Grand Orchid Flower | SKU: BOTPUOR002 | Qty: 5 | Unit: €18.12 | Total: €90.60
3. Red Poppy Flower | SKU: BOTREPO001 | Qty: 63 | Unit: €4.07 | Total: €256.41
4. White Small Lily Flower | SKU: BOTWHLIL001 | Qty: 10 | Unit: €7.76 | Total: €77.60
5. Peony Bouquet | SKU: BOTBOU064 | Qty: 77 | Unit: €26.62 | Total: €2,049.74
6. Wild Poppy Dance | SKU: Botsp25bou019 | Qty: 49 | Unit: €31.06 | Total: €1,521.94
... (103 total items)

TOTAL: 1,794 units — EUR 27,643.46 (after 2% return discount)`,
    },
  },
  {
    id: "email_003",
    from: "order@royaldesign.se",
    subject: "Purchase Order 1127653 — Botané",
    date: new Date().toISOString(),
    partner: "royal_design",
    type: "new_order",
    body: `Hello partnerships@botanestudios.com,

Our purchase order is attached to this email.
Please remember to state our PO Number (1127653) clearly on the delivery note.

Ship to: Royal Design Group AB, Porfyrvägen 2, 382 37 Nybro, Sweden
Payment: 45 days net
Currency: SEK

We are happy to do business with you.

Royal Design Group AB / Rum21 / AndLight`,
    attachment: {
      name: "PurchaseOrder_1127653.pdf",
      content: `ROYAL DESIGN — PURCHASE ORDER
PO Number: 1127653
Date: 26-04-13
Currency: SEK

LINE ITEMS:
1. Cool Grass | SKU: BOT-BOU-099 | Qty: 24 | Unit: SEK 547.20 | Total: SEK 13,132.80
2. Enchanted Matcha | SKU: BOT-BOU-098 | Qty: 8 | Unit: SEK 547.20 | Total: SEK 4,377.60
3. Popsicle | SKU: BOT-BOU-084 | Qty: 8 | Unit: SEK 646.40 | Total: SEK 5,171.20
4. Elegant Lily Bouquet | SKU: BOT-BOU-094 | Qty: 8 | Unit: SEK 323.20 | Total: SEK 2,585.60
5. Coquette | SKU: BOT-BOU-012 | Qty: 8 | Unit: SEK 499.20 | Total: SEK 3,993.60
6. Sorbet Kisses | SKU: BOT-SP25-BOU-039 | Qty: 8 | Unit: SEK 438.40 | Total: SEK 3,507.20
7. White Tulip Bouquet Mixed | SKU: BOT-BOU-166 | Qty: 8 | Unit: SEK 400.00 | Total: SEK 3,200.00
8. Fiddle Leaf Fig Stems | SKU: BOT-TP-002 | Qty: 1 | Unit: SEK 1,590.40 | Total: SEK 1,590.40
9. Monstera Plant | SKU: BOT-TP-005 | Qty: 1 | Unit: SEK 944.00 | Total: SEK 944.00

TOTAL: 74 units — SEK 38,502.40`,
    },
  },
  {
    id: "email_004",
    from: "ukap@gant.com",
    subject: "Tracking update — Bouquet order to Ireland",
    date: new Date().toISOString(),
    partner: "gant",
    type: "tracking_request",
    body: `Hello Camila, hope you are well!

Do you have an estimated arrival time and/or tracking ID for the bouquets heading to our Ireland store (Kildare Village)?

Thanks so much,
Asia Malek
GANT UK & Ireland`,
  },
];

export const STOCK_DATA: Record<string, StockInfo> = {
  "5740034503164": { sku: "5740034503164", available: 24 },
  "5740034502556": { sku: "5740034502556", available: 20 },
  "5740034503324": { sku: "5740034503324", available: 40 },
  "5740034513996": { sku: "5740034513996", available: 12 },
  "5740034502549": { sku: "5740034502549", available: 16 },
  "5740034503096": { sku: "5740034503096", available: 32 },
  BOTBOU160: { sku: "BOTBOU160", available: 30 },
  BOTPUOR002: { sku: "BOTPUOR002", available: 8 },
  BOTREPO001: { sku: "BOTREPO001", available: 80 },
  BOTWHLIL001: { sku: "BOTWHLIL001", available: 0, restock_date: "2026-04-28" },
  BOTBOU064: { sku: "BOTBOU064", available: 50 },
  Botsp25bou019: { sku: "Botsp25bou019", available: 0, restock_date: "2026-05-03" },
  "BOT-BOU-099": { sku: "BOT-BOU-099", available: 30 },
  "BOT-BOU-098": { sku: "BOT-BOU-098", available: 12 },
  "BOT-BOU-084": { sku: "BOT-BOU-084", available: 10 },
  "BOT-BOU-094": { sku: "BOT-BOU-094", available: 8 },
  "BOT-BOU-012": { sku: "BOT-BOU-012", available: 20 },
  "BOT-SP25-BOU-039": { sku: "BOT-SP25-BOU-039", available: 0, restock_date: "2026-04-30" },
  "BOT-BOU-166": { sku: "BOT-BOU-166", available: 15 },
  "BOT-TP-002": { sku: "BOT-TP-002", available: 3 },
  "BOT-TP-005": { sku: "BOT-TP-005", available: 2 },
};

export const PARSED_ORDERS: Record<string, ParsedOrder> = {
  email_001: {
    po_number: "200936891",
    partner: "de_bijenkorf",
    currency: "EUR",
    delivery_date: "15/04/2026 – 24/04/2026",
    total: 1872.0,
    items: [
      { sku: "5740034503164", name: "Mini Rose Bouquet Dark Red", quantity: 8, unit_price: 16.0, currency: "EUR" },
      { sku: "5740034502556", name: "Mini Rose Bouquet Light Pink", quantity: 8, unit_price: 16.0, currency: "EUR" },
      { sku: "5740034503324", name: "Peony Bouquet Multicolor", quantity: 16, unit_price: 28.8, currency: "EUR" },
      { sku: "5740034513996", name: "Perfectly Plum Multicolor", quantity: 8, unit_price: 60.0, currency: "EUR" },
      { sku: "5740034502549", name: "Poppy Spritz Multicolor", quantity: 8, unit_price: 42.0, currency: "EUR" },
      { sku: "5740034503096", name: "Tulip Bouquet Orange", quantity: 16, unit_price: 21.2, currency: "EUR" },
    ],
  },
  email_002: {
    po_number: "3109V2QMS00D01",
    partner: "westwing",
    currency: "EUR",
    delivery_date: "22.04.2026",
    total: 27643.46,
    items: [
      { sku: "BOTBOU160", name: "Pink Triumph Tulip Bouquet", quantity: 26, unit_price: 24.4, currency: "EUR" },
      { sku: "BOTPUOR002", name: "Purple Grand Orchid Flower", quantity: 5, unit_price: 18.12, currency: "EUR" },
      { sku: "BOTREPO001", name: "Red Poppy Flower", quantity: 63, unit_price: 4.07, currency: "EUR" },
      { sku: "BOTWHLIL001", name: "White Small Lily Flower", quantity: 10, unit_price: 7.76, currency: "EUR" },
      { sku: "BOTBOU064", name: "Peony Bouquet", quantity: 77, unit_price: 26.62, currency: "EUR" },
      { sku: "Botsp25bou019", name: "Wild Poppy Dance", quantity: 49, unit_price: 31.06, currency: "EUR" },
    ],
  },
  email_003: {
    po_number: "1127653",
    partner: "royal_design",
    currency: "SEK",
    delivery_date: "TBD",
    total: 38502.4,
    items: [
      { sku: "BOT-BOU-099", name: "Cool Grass", quantity: 24, unit_price: 547.2, currency: "SEK" },
      { sku: "BOT-BOU-098", name: "Enchanted Matcha", quantity: 8, unit_price: 547.2, currency: "SEK" },
      { sku: "BOT-BOU-084", name: "Popsicle", quantity: 8, unit_price: 646.4, currency: "SEK" },
      { sku: "BOT-BOU-094", name: "Elegant Lily Bouquet", quantity: 8, unit_price: 323.2, currency: "SEK" },
      { sku: "BOT-BOU-012", name: "Coquette", quantity: 8, unit_price: 499.2, currency: "SEK" },
      { sku: "BOT-SP25-BOU-039", name: "Sorbet Kisses", quantity: 8, unit_price: 438.4, currency: "SEK" },
      { sku: "BOT-BOU-166", name: "White Tulip Bouquet Mixed", quantity: 8, unit_price: 400.0, currency: "SEK" },
      { sku: "BOT-TP-002", name: "Fiddle Leaf Fig Stems", quantity: 1, unit_price: 1590.4, currency: "SEK" },
      { sku: "BOT-TP-005", name: "Monstera Plant", quantity: 1, unit_price: 944.0, currency: "SEK" },
    ],
  },
};
