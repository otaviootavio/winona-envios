import { type AxiosInstance, type AxiosError, isAxiosError } from "axios";
import axios from "axios";

interface TokenResponse {
  token: string;
  expiraEm: string;
  ambiente?: string;
  contrato?: {
    numero: string;
    dr?: number;
  };
}

interface CorreiosCredentials {
  identifier: string;
  accessCode: string;
}

interface ContractCredentials {
  numero: string; // contract number
  dr?: number; // optional regional number
}

interface CorreiosErrorResponse {
  msgs?: string[];
  message?: string;
}

export class CorreiosAuthRepository {
  private readonly api: AxiosInstance;
  private readonly baseURL = "https://api.correios.com.br";

  constructor() {
    console.log("[CorreiosAuthRepository] Initializing");

    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request logging
    this.api.interceptors.request.use(
      (config) => {
        const sanitizedConfig = {
          ...config,
          headers: {
            ...config.headers,
            Authorization: config.headers.Authorization
              ? "[FILTERED]"
              : undefined,
          },
        };

        console.log(
          `[CorreiosAuthRepository] Making ${config.method?.toUpperCase()} request to ${config.url}`,
          sanitizedConfig,
        );
        return config;
      },
      (error: Error) => {
        console.error("[CorreiosAuthRepository] Request failed to send");
        return Promise.reject(error);
      },
    );

    // Response logging
    this.api.interceptors.response.use(
      (response) => {
        const tokenResponse = response.data as TokenResponse;
        console.log("[CorreiosAuthRepository] Response received:", {
          status: response.status,
          tokenReceived: !!tokenResponse.token,
          expiration: tokenResponse.expiraEm,
        });
        return response;
      },
      (error: Error) => {
        const axiosError = error as AxiosError<CorreiosErrorResponse>;
        console.error("[CorreiosAuthRepository] Request failed:", {
          status: axiosError.response?.status,
          errorMessage:
            axiosError.response?.data?.msgs?.[0] ?? axiosError.message,
        });
        return Promise.reject(error);
      },
    );
  }

  // Basic authentication (for public APIs)
  async authenticate(credentials: CorreiosCredentials): Promise<TokenResponse> {
    try {
      console.log(
        "[CorreiosAuthRepository] Authenticating with basic credentials",
      );

      const basicAuth = Buffer.from(
        `${credentials.identifier.trim()}:${credentials.accessCode.trim()}`,
      ).toString("base64");

      const response = await this.api.post<TokenResponse>(
        "/token/v1/autentica",
        null,
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error("[CorreiosAuthRepository] Basic authentication failed");
      throw this.handleError(error);
    }
  }

  // Contract-based authentication (for restricted APIs)
  async authenticateWithContract(
    credentials: CorreiosCredentials,
    contract: ContractCredentials,
  ): Promise<TokenResponse> {
    try {
      console.log(
        "[CorreiosAuthRepository] Authenticating with contract credentials",
      );

      const basicAuth = Buffer.from(
        `${credentials.identifier.trim()}:${credentials.accessCode.trim()}`,
      ).toString("base64");

      const response = await this.api.post<TokenResponse>(
        "/token/v1/autentica/contrato",
        {
          numero: contract.numero.trim(),
          dr: contract.dr,
        },
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error("[CorreiosAuthRepository] Contract authentication failed");
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data as CorreiosErrorResponse;
      const errorMessage = errorData?.msgs?.[0] ?? error.message;

      console.error("[CorreiosAuthRepository] Error details:", {
        status,
        message: errorMessage,
      });

      switch (status) {
        case 400:
          return new Error(`Invalid request parameters: ${errorMessage}`);
        case 401:
          return new Error(`Invalid credentials: ${errorMessage}`);
        case 429:
          return new Error("Too many requests. Please wait and try again.");
        case 500:
          return new Error(`Authentication server error: ${errorMessage}`);
        default:
          return new Error(
            `Authentication failed (${status}): ${errorMessage}`,
          );
      }
    }
    return new Error("Network request failed");
  }
}
