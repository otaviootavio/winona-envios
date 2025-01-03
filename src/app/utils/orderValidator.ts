import type { ParsedOrder } from "./csvParser";

export function isValidTrackingCode(code: string | null): boolean {
  if (!code) return false;
  // Correios tracking codes: two letters, 9 numbers, BR
  return /^[A-Z]{2}\d{9}BR$/i.test(code);
}

export function filterValidOrders(orders: ParsedOrder[]): {
  validOrders: ParsedOrder[];
  invalidCount: number;
} {
  const validOrders = orders.filter(
    order => order.trackingCode && isValidTrackingCode(order.trackingCode)
  );

  return {
    validOrders,
    invalidCount: orders.length - validOrders.length
  };
}