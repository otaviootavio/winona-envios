export interface TrackingOriginDestiny {
  nome: string;
  cidade: string;
  uf: string;
}

export interface TrackingHistoryEvent {
  datahora: string;
  cidade: string;
  uf: string;
  descricao: string;
  origem: TrackingOriginDestiny;
  destino: TrackingOriginDestiny | null;
  normalizado_datahora: string;
}

export interface TrackingData {
  datahora: string;
  historico: TrackingHistoryEvent[];
  normalizado_datahora: string;
  normalizado_previsao_entrega: string;
  previsao_entrega: string | null;
  situacao: string;
  site_receipt: string;
}

export interface InfoSimplesApiResponse {
  code: number;
  code_message: string;
  header: {
    api_version: string;
    api_version_full: string;
    product: string;
    service: string;
    parameters: {
      tracking_code: string;
    };
    client_name: string;
    token_name: string;
    billable: boolean;
    price: string;
    requested_at: string;
    elapsed_time_in_milliseconds: number;
    remote_ip: string;
    signature: string;
  };
  data_count: number;
  data: TrackingData[];
  errors: string[];
  site_receipts: string[];
}

export interface InfoSimplesClientConfig {
  token: string;
  timeout?: number;
  baseUrl?: string;
}
