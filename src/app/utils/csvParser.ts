import Papa from "papaparse";
import type { ParseResult } from "papaparse";
import type { Order, OrderStatus } from "@prisma/client";

export type ParsedOrder = Pick<
  Order,
  "orderNumber" | "shippingStatus" | "trackingCode"
>;

type Matrix = number[][];

const OrderSchema = {
  parse: (data: unknown): ParsedOrder => {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid order data");
    }

    const order = data as Partial<ParsedOrder>;

    // Validate order number
    if (
      typeof order.orderNumber !== "string" ||
      order.orderNumber.trim() === ""
    ) {
      throw new Error(
        "Order number is required and must be a non-empty string",
      );
    }

    // Validate shipping status (defaulting to UNKNOWN if not provided)
    order.shippingStatus = "UNKNOWN";

    // Validate tracking code (allow null or string)
    if (order.trackingCode !== null && typeof order.trackingCode !== "string") {
      throw new Error("Tracking code must be a string or null");
    }

    return {
      orderNumber: order.orderNumber,
      shippingStatus: order.shippingStatus as OrderStatus,
      trackingCode: order.trackingCode ?? null,
    };
  },
};

export class CSVParser {
  private static readonly COLUMN_VARIANTS = {
    orderNumber: [
      "numero do pedido",
      "número do pedido",
      "N�mero do Pedido",
      "order number",
      "ordernumber",
      "pedido",
    ],
    shippingStatus: [
      "status do envio",
      "shipping status",
      "status",
      "status envio",
    ],
    trackingCode: [
      "codigo de rastreio",
      "código de rastreio",
      "tracking code",
      "rastreio",
      "código de rastreio do envio",
    ],
  };

  private static normalizeText(text: string): string {
    return text
      .normalize("NFD")
      .replace(/[̀-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  private static cleanValue(value: string): string | null {
    const cleaned = value.replace(/^="(.*)"$/, "$1").trim();
    if (cleaned === "" || /^(=" )*=""$/.test(value)) return null;

    const trackingMatch = /^="([A-Z0-9]+)"$/.exec(value);
    return trackingMatch?.[1] ?? (cleaned || null);
  }

  private static createMatrix(rows: number, cols: number): Matrix {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => 0),
    );
  }

  private static safeGet(matrix: Matrix, i: number, j: number): number {
    return matrix[i]?.[j] ?? Infinity;
  }

  private static safeSet(
    matrix: Matrix,
    i: number,
    j: number,
    value: number,
  ): void {
    if (matrix[i]) matrix[i][j] = value;
  }

  private static levenshteinDistance(a: string, b: string): number {
    if (!a || !b) return Math.max(a?.length ?? 0, b?.length ?? 0);
    const rows = b.length + 1;
    const cols = a.length + 1;
    const matrix = this.createMatrix(rows, cols);

    for (let i = 0; i < rows; i++) this.safeSet(matrix, i, 0, i);
    for (let j = 0; j < cols; j++) this.safeSet(matrix, 0, j, j);

    for (let i = 1; i < rows; i++) {
      for (let j = 1; j < cols; j++) {
        const cost = b[i - 1] === a[j - 1] ? 0 : 1;
        const insert = this.safeGet(matrix, i, j - 1) + 1;
        const remove = this.safeGet(matrix, i - 1, j) + 1;
        const replace = this.safeGet(matrix, i - 1, j - 1) + cost;
        this.safeSet(matrix, i, j, Math.min(insert, remove, replace));
      }
    }
    return this.safeGet(matrix, rows - 1, cols - 1);
  }

  private static findBestMatch(
    header: string,
    variants: string[],
  ): string | null {
    if (!header) return null;

    const normalizedHeader = this.normalizeText(header);
    if (
      variants.some(
        (variant) => this.normalizeText(variant) === normalizedHeader,
      )
    ) {
      return header;
    }

    let bestMatch = null;
    let minDistance = 3;
    for (const variant of variants) {
      const distance = this.levenshteinDistance(
        normalizedHeader,
        this.normalizeText(variant),
      );
      if (distance <= 2 && distance < minDistance) {
        minDistance = distance;
        bestMatch = header;
      }
    }

    return bestMatch;
  }

  private static findColumns(headers: string[]): {
    orderNumber: string;
    shippingStatus: string;
    trackingCode: string;
  } {
    const normalizedHeaders = headers.map((h) => this.normalizeText(h));

    const matchColumn = (variants: string[]) => {
      for (const variant of variants) {
        const normalizedVariant = this.normalizeText(variant);
        const matchIndex = normalizedHeaders.findIndex(
          (h) => h.includes(normalizedVariant) || normalizedVariant.includes(h),
        );

        if (matchIndex !== -1) {
          return headers[matchIndex];
        }
      }
      return "";
    };

    return {
      orderNumber: matchColumn([  
        ...this.COLUMN_VARIANTS.orderNumber,
        "numero",
        "pedido",
      ]) ?? "",
      shippingStatus: matchColumn([
        ...this.COLUMN_VARIANTS.shippingStatus,
        "status",
        "envio",
      ]) ?? "",
      trackingCode: matchColumn([
        ...this.COLUMN_VARIANTS.trackingCode,
        "rastreio",
        "tracking",
      ]) ?? "",
    };
  }

  static async parseOrders(file: File): Promise<ParsedOrder[]> {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: ParseResult<Record<string, string>>) => {
          try {
            const headers = Object.keys(results.data[0] ?? {});
            const columns = this.findColumns(headers);
            if (!columns.orderNumber)
              throw new Error("Could not find order number column in CSV");

            const orders = results.data
              .map((row) => {
                const orderNumber = this.cleanValue(
                  row[columns.orderNumber] ?? "",
                );
                const trackingCode = this.cleanValue(
                  row[columns.trackingCode] ?? "",
                );

                if (!orderNumber) return null;

                // Validate and parse the order
                try {
                  return OrderSchema.parse({
                    orderNumber,
                    trackingCode,
                  });
                } catch (validationError) {
                  const errorMessage =
                    validationError instanceof Error
                      ? validationError.message
                      : String(validationError);

                  console.warn(`Skipping invalid order: ${errorMessage}`);
                  return null;
                }
              })
              .filter((order): order is ParsedOrder => order !== null);

            if (orders.length === 0)
              throw new Error("No valid orders found in the CSV file");
            resolve(orders);
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        },
        error: (error) => reject(new Error(error.message)),
      });
    });
  }
}