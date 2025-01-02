import { type InfoSimplesApiResponse, type InfoSimplesClientConfig, TrackingData, TrackingHistoryEvent } from "./types";
  
  export class InfoSimplesCorreiosMockClient {
    private readonly mockDelay: number;
  
    constructor(config: InfoSimplesClientConfig) {
      // Simulate some network delay (but faster than real API)
      this.mockDelay = config.timeout ?? 500;
    }
  
    private async delay(): Promise<void> {
      await new Promise((resolve) => setTimeout(resolve, this.mockDelay));
    }
  
    private generateSuccessResponse(trackingCode: string): InfoSimplesApiResponse {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
  
      const mockHistorico: TrackingHistoryEvent[] = [
        {
          datahora: yesterday.toLocaleString(),
          cidade: "Ribeirao Preto",
          uf: "SP",
          descricao: "Objeto postado",
          origem: {
            nome: "Agência dos Correios",
            cidade: "Ribeirao Preto",
            uf: "SP",
          },
          destino: null,
          normalizado_datahora: yesterday.toISOString(),
        },
        {
          datahora: now.toLocaleString(),
          cidade: "Ribeirao Preto",
          uf: "SP",
          descricao: "Objeto em transferência - por favor aguarde",
          origem: {
            nome: "Unidade de Tratamento",
            cidade: "Ribeirao Preto",
            uf: "SP",
          },
          destino: {
            nome: "Unidade de Tratamento",
            cidade: "Rio de Janeiro",
            uf: "RJ",
          },
          normalizado_datahora: now.toISOString(),
        },
      ];
  
      const mockData: TrackingData = {
        datahora: now.toLocaleString(),
        historico: mockHistorico,
        normalizado_datahora: now.toISOString(),
        normalizado_previsao_entrega: "",
        previsao_entrega: null,
        situacao: "Em trânsito para Rio de Janeiro/RJ",
        site_receipt: "mock-receipt-url",
      };
  
      return {
        code: 200,
        code_message: "A requisição foi processada com sucesso.",
        header: {
          api_version: "v2",
          api_version_full: "2.2.23-mock",
          product: "Consultas",
          service: "correios/rastreamento",
          parameters: {
            tracking_code: trackingCode,
          },
          client_name: "Mock Client",
          token_name: "Mock Token",
          billable: false,
          price: "0.0",
          requested_at: now.toISOString(),
          elapsed_time_in_milliseconds: this.mockDelay,
          remote_ip: "127.0.0.1",
          signature: "mock-signature",
        },
        data_count: 1,
        data: [mockData],
        errors: [],
        site_receipts: ["mock-receipt-url"],
      };
    }
  
    private generateNotFoundResponse(trackingCode: string): InfoSimplesApiResponse {
      const now = new Date();
  
      return {
        code: 612,
        code_message: "A consulta não retornou dados no site ou aplicativo de origem no qual a automação foi executada.",
        header: {
          api_version: "v2",
          api_version_full: "2.2.23-mock",
          product: "Consultas",
          service: "correios/rastreamento",
          parameters: {
            tracking_code: trackingCode,
          },
          client_name: "Mock Client",
          token_name: "Mock Token",
          billable: false,
          price: "0.2",
          requested_at: now.toISOString(),
          elapsed_time_in_milliseconds: this.mockDelay,
          remote_ip: "127.0.0.1",
          signature: "mock-signature",
        },
        data_count: 0,
        data: [],
        errors: [
          "Objeto não encontrado na base de dados dos Correios."
        ],
        site_receipts: [],
      };
    }
  
    async trackPackage(trackingCode: string): Promise<InfoSimplesApiResponse> {
      await this.delay();
  
      // Simulate different scenarios based on tracking code
      if (trackingCode.startsWith("OK")) {
        // Valid tracking code with tracking information
        return this.generateSuccessResponse(trackingCode);
      } else if (trackingCode.startsWith("NF")) {
        // Tracking code not found
        return this.generateNotFoundResponse(trackingCode);
      } else {
        // Default to not found for most other codes
        return this.generateNotFoundResponse(trackingCode);
      }
    }
  
    async trackingCodeExists(trackingCode: string): Promise<boolean> {
      await this.delay();
      // Only codes starting with 'OK' are considered valid
      return trackingCode.startsWith("OK");
    }
  }