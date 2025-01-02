import Papa from "papaparse";
import type { ParseResult } from "papaparse";
import type { Order } from "@prisma/client";

export type ParsedOrder = Pick<Order, "orderNumber" | "shippingStatus" | "trackingCode">;

type Matrix = number[][];

export class CSVParser {
  private static readonly COLUMN_VARIANTS = {
    orderNumber: ['numero do pedido', 'número do pedido', 'order number', 'ordernumber', 'pedido'],
    shippingStatus: ['status do envio', 'shipping status', 'status', 'status envio'],
    trackingCode: ['codigo de rastreio', 'código de rastreio', 'tracking code', 'rastreio', 'código de rastreio do envio']
  };

  private static normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private static cleanValue(value: string): string | null {
    // Remove common Excel CSV artifacts
    const cleaned = value.replace(/^="(.*)"$/, '$1').trim();
    
    // Handle empty Excel cells that come as ="" or series of ="" ="" =""
    if (cleaned === '' || /^(="" )*=""$/.test(value)) {
      return null;
    }

    // Handle actual tracking codes that come as ="CODE"
    const trackingMatch = value.match(/^="([A-Z0-9]+)"$/);
    if (trackingMatch && trackingMatch[1]) {
      return trackingMatch[1];
    }

    return cleaned || null;
  }

  private static createMatrix(rows: number, cols: number): Matrix {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => 0)
    );
  }

  private static safeGet(matrix: Matrix, i: number, j: number): number {
    return matrix[i]?.[j] ?? Infinity;
  }

  private static safeSet(matrix: Matrix, i: number, j: number, value: number): void {
    if (matrix[i]) {
      matrix[i][j] = value;
    }
  }

  private static levenshteinDistance(a: string, b: string): number {
    if (!a || !b) return 0;
    
    const rows = b.length + 1;
    const cols = a.length + 1;
    const matrix = this.createMatrix(rows, cols);

    // Initialize first row and column
    for (let i = 0; i < rows; i++) {
      this.safeSet(matrix, i, 0, i);
    }
    for (let j = 0; j < cols; j++) {
      this.safeSet(matrix, 0, j, j);
    }

    // Fill in the rest of the matrix
    for (let i = 1; i < rows; i++) {
      for (let j = 1; j < cols; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          this.safeSet(matrix, i, j, this.safeGet(matrix, i - 1, j - 1));
        } else {
          const min = Math.min(
            this.safeGet(matrix, i - 1, j) + 1,
            this.safeGet(matrix, i, j - 1) + 1,
            this.safeGet(matrix, i - 1, j - 1) + 1
          );
          this.safeSet(matrix, i, j, min);
        }
      }
    }

    return this.safeGet(matrix, rows - 1, cols - 1);
  }

  private static findBestMatch(header: string, variants: string[]): string | null {
    if (!header) return null;
    
    const normalizedHeader = this.normalizeText(header);
    
    // First try exact match
    if (variants.some(variant => this.normalizeText(variant) === normalizedHeader)) {
      return header;
    }

    let bestMatch = null;
    let minDistance = 3; // More than our tolerance

    for (const variant of variants) {
      if (!variant) continue;
      const distance = this.levenshteinDistance(normalizedHeader, this.normalizeText(variant));
      if (distance <= 2 && distance < minDistance) {
        minDistance = distance;
        bestMatch = header;
      }
    }

    return bestMatch;
  }

  private static findColumns(headers: string[]): {
    orderNumber: string | null;
    shippingStatus: string | null;
    trackingCode: string | null;
  } {
    const result = {
      orderNumber: null as string | null,
      shippingStatus: null as string | null,
      trackingCode: null as string | null
    };

    for (const header of headers) {
      if (header) {
        if (!result.orderNumber) {
          const orderMatch = this.findBestMatch(header, this.COLUMN_VARIANTS.orderNumber);
          if (orderMatch) result.orderNumber = orderMatch;
        }
        if (!result.shippingStatus) {
          const statusMatch = this.findBestMatch(header, this.COLUMN_VARIANTS.shippingStatus);
          if (statusMatch) result.shippingStatus = statusMatch;
        }
        if (!result.trackingCode) {
          const trackingMatch = this.findBestMatch(header, this.COLUMN_VARIANTS.trackingCode);
          if (trackingMatch) result.trackingCode = trackingMatch;
        }
      }
    }

    return result;
  }

  static async parseOrders(file: File): Promise<ParsedOrder[]> {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: ParseResult<Record<string, string>>) => {
          try {
            const firstRow = results.data[0];
            if (!firstRow) {
              throw new Error('CSV file is empty');
            }

            const headers = Object.keys(firstRow);
            const columns = this.findColumns(headers);

            if (!columns.orderNumber) {
              throw new Error('Could not find order number column in CSV');
            }

            const orders = results.data
              .filter((row): row is Record<string, string> => {
                if (!row || !columns.orderNumber) return false;
                const value = row[columns.orderNumber];
                return typeof value === 'string' && value.length > 0;
              })
              .map(row => {
                // We know orderNumber exists and is a string from the filter
                const orderNumber = row[columns.orderNumber!];
                if (typeof orderNumber !== 'string') {
                  throw new Error('Invalid order number type');
                }
                const cleanedOrderNumber = this.cleanValue(orderNumber);

                if (!cleanedOrderNumber) {
                  throw new Error('Invalid order number');
                }

                const shippingStatus = columns.shippingStatus && 
                  typeof row[columns.shippingStatus] === 'string'
                  ? this.cleanValue(row[columns.shippingStatus] as string) ?? "Desconhecido"
                  : "Desconhecido";

                const trackingCode = columns.trackingCode && 
                  typeof row[columns.trackingCode] === 'string'
                  ? this.cleanValue(row[columns.trackingCode] as string)
                  : null;

                return {
                  orderNumber: cleanedOrderNumber,
                  shippingStatus,
                  trackingCode,
                };
              });

            if (orders.length === 0) {
              throw new Error('No valid orders found in the CSV file');
            }

            console.log('Matched columns:', columns);
            resolve(orders);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => reject(error)
      });
    });
  }
}