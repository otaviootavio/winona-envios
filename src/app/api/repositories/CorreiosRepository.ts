import axios, { type AxiosInstance, isAxiosError } from "axios";

interface TrackingResult {
  T: "Todos os eventos";
  P: "Primeiro evento";
  U: "Último evento";
}

interface TrackingEvent {
  codigo: string;
  descricao: string;
  dtHrCriado: string;
  tipo: string;
  unidade: {
    endereco: {
      cidade: string;
      uf: string;
    };
  };
  unidadeDestino?: {
    endereco: {
      cidade: string;
      uf: string;
    };
  };
}

interface TrackingObject {
  codObjeto: string;
  eventos: TrackingEvent[];
}

interface TrackingResponse {
  versao: string;
  quantidade: number;
  objetos: TrackingObject[];
  tipoResultado: keyof TrackingResult;
}

interface CorreiosErrorResponse {
  msgs?: string[];
  message?: string;
}

export class CorreiosRepository {
  private readonly api: AxiosInstance;
  private readonly baseURL = "https://api.correios.com.br";

  constructor(token: string) {
    console.log("[CorreiosRepository] Initializing");

    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Add request logging
    this.api.interceptors.request.use(
      (config) => {
        console.log(
          `[CorreiosRepository] Making ${config.method?.toUpperCase()} request to ${config.url}`,
        );
        if (config.params) {
          console.log("[CorreiosRepository] Request params:", config.params);
        }
        return config;
      },
      (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : "Request failed to send";
        console.error(
          "[CorreiosRepository] Request failed to send:",
          errorMessage,
        );
        return Promise.reject(new Error(errorMessage));
      },
    );

    // Add response logging
    this.api.interceptors.response.use(
      (response) => {
        const responseData = response.data as TrackingResponse;
        console.log(`[CorreiosRepository] Response received:`, {
          status: response.status,
          objectCount: responseData.quantidade,
        });
        return response;
      },
      (error: unknown) => {
        let errorMessage = "An unexpected error occurred";

        if (isAxiosError(error)) {
          const errorData = error.response?.data as CorreiosErrorResponse;
          errorMessage = errorData?.msgs?.[0] ?? error.message;

          console.error("[CorreiosRepository] Request failed:", {
            status: error.response?.status,
            errorMessage,
            fullError: errorData,
          });
        } else {
          console.error(
            "[CorreiosRepository] Non-Axios error occurred:",
            error,
          );
        }

        return Promise.reject(new Error(errorMessage));
      },
    );
  }

  async getObjectTracking(
    trackingCode: string,
    result: keyof TrackingResult = "T",
  ): Promise<TrackingResponse> {
    console.log("[CorreiosRepository] Tracking request:", {
      trackingCode,
      result,
    });
    try {
      // Format the tracking code parameter correctly
      const params = new URLSearchParams();
      params.append("codigosObjetos", trackingCode);
      params.append("resultado", result);

      const response = await this.api.get<TrackingResponse>(
        "/srorastro/v1/objetos",
        {
          params: params,
        },
      );

      return response.data;
    } catch (error) {
      console.error(
        "[CorreiosRepository] Tracking request failed for:",
        trackingCode,
      );
      this.handleError(error);
    }
  }

  async getMultipleObjectsTracking(
    trackingCodes: string[],
    result: keyof TrackingResult = "U",
  ): Promise<TrackingResponse> {
    if (!Array.isArray(trackingCodes)) {
      throw new Error("Tracking codes must be provided as an array");
    }

    if (trackingCodes.length > 50) {
      throw new Error("Maximum of 50 tracking codes allowed per request");
    }

    console.log("[CorreiosRepository] Multiple tracking request:", {
      count: trackingCodes.length,
      result,
    });

    try {
      // Format multiple tracking codes correctly
      const params = new URLSearchParams();
      trackingCodes.forEach((code) => {
        params.append("codigosObjetos", code);
      });
      params.append("resultado", result);

      const response = await this.api.get<TrackingResponse>(
        "/srorastro/v1/objetos",
        {
          params: params,
        },
      );

      return response.data;
    } catch (error) {
      console.error("[CorreiosRepository] Multiple tracking request failed");
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data as CorreiosErrorResponse;
      const errorMessage = errorData?.msgs?.[0] ?? error.message;

      console.error("[CorreiosRepository] Error details:", {
        status,
        message: errorMessage ?? "Unknown error",
      });

      switch (status) {
        case 400:
          throw new Error(`Invalid request parameters: ${errorMessage}`);
        case 403:
          throw new Error(
            "Authentication failed. Please check your credentials.",
          );
        case 500:
          throw new Error("Correios API server error");
        default:
          throw new Error(`Failed to process request: ${errorMessage}`);
      }
    }
    throw new Error("Network request failed");
  }
}
