import Papa from "papaparse";
import type { ParseResult } from "papaparse";
import type { Order } from "@prisma/client";

export type ParsedOrder = Pick<Order, "orderNumber" | "shippingStatus" | "trackingCode">;

export class CSVParser {
  static async parseOrders(file: File): Promise<ParsedOrder[]> {
    const text = await file.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results: ParseResult<Record<string, string>>) => {
          const orders = results.data
            .filter((row) => (
              row["Número do Pedido"] &&
              row["Status do Envio"] &&
              row["Código de rastreio do envio"]
            ))
            .map((row) => ({
              orderNumber: String(row["Número do Pedido"]).trim(),
              shippingStatus: String(row["Status do Envio"]).trim(),
              trackingCode: row["Código de rastreio do envio"]
                ? String(row["Código de rastreio do envio"]).trim()
                : null,
            }));
          
          resolve(orders);
        },
        error: reject,
      });
    });
  }
}