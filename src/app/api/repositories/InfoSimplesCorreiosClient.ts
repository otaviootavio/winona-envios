import {
  InfoSimplesApiResponse,
  InfoSimplesClientConfig,
} from "~/app/api/repositories/types";

export class InfoSimplesCorreiosClient {
  private readonly token: string;
  private readonly timeout: number;
  private readonly baseUrl: string;

  constructor(config: InfoSimplesClientConfig) {
    this.token = config.token;
    this.timeout = config.timeout || 300;
    this.baseUrl = config.baseUrl || "https://api.infosimples.com/api/v2";

    console.log("[InfoSimplesClient] Initialized with config:", {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      tokenLength: this.token.length, // Log token length for security
    });
  }

  /**
   * Tracks a package using its tracking code
   * @param trackingCode - The tracking code to search for
   * @returns Promise with tracking information
   */
  async trackPackage(trackingCode: string): Promise<InfoSimplesApiResponse> {
    console.log(
      "[InfoSimplesClient] Starting trackPackage request for code:",
      trackingCode,
    );

    const url = new URL(`${this.baseUrl}/consultas/correios/rastreamento`);
    console.log("[InfoSimplesClient] Request URL:", url.toString());

    const formData = new URLSearchParams();
    formData.append("tracking_code", trackingCode);
    formData.append("token", this.token);
    formData.append("timeout", this.timeout.toString());

    console.log("[InfoSimplesClient] Request payload:", {
      tracking_code: trackingCode,
      timeout: this.timeout,
      formDataString: formData.toString(),
    });

    try {
      console.log("[InfoSimplesClient] Sending fetch request...");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      console.log("[InfoSimplesClient] Received response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        console.error("[InfoSimplesClient] HTTP error:", {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: InfoSimplesApiResponse = await response.json();
      console.log("[InfoSimplesClient] Parsed response data:", {
        code: data.code,
        code_message: data.code_message,
        data_count: data.data_count,
        errors: data.errors,
        tracking_status: data.data?.[0]?.situacao,
      });

      return data;
    } catch (error) {
      console.error("[InfoSimplesClient] Error in trackPackage:", {
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack,
              }
            : error,
        trackingCode,
      });

      if (error instanceof Error) {
        throw new Error(`Failed to track package: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Checks if a tracking code exists
   * @param trackingCode - The tracking code to verify
   * @returns Promise<boolean> indicating if the tracking code exists
   */
  async trackingCodeExists(trackingCode: string): Promise<boolean> {
    console.log(
      "[InfoSimplesClient] Checking if tracking code exists:",
      trackingCode,
    );

    try {
      const response = await this.trackPackage(trackingCode);
      // Only return true if we get code 200 and have data
      const exists = response.code === 200 && response.data_count > 0;

      console.log("[InfoSimplesClient] Tracking code check result:", {
        trackingCode,
        exists,
        responseCode: response.code,
        dataCount: response.data_count,
      });

      return exists;
    } catch (error) {
      console.error("[InfoSimplesClient] Error checking tracking code:", {
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack,
              }
            : error,
        trackingCode,
      });
      return false;
    }
  }
}
