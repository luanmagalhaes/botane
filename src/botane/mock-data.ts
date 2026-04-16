import type { StockInfo } from "./types.js";

// Stock levels — this is the only mock left.
// In production, this would call the Shopify API.
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
