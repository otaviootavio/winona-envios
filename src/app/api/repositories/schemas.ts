import { z } from "zod";

export const TrackingOriginDestinySchema = z.object({
  nome: z.string(),
  cidade: z.string(),
  uf: z.string(),
});

export const TrackingHistoryEventSchema = z.object({
  datahora: z.string(),
  cidade: z.string(),
  uf: z.string(),
  descricao: z.string(),
  origem: TrackingOriginDestinySchema,
  destino: TrackingOriginDestinySchema.nullable(),
  normalizado_datahora: z.string(),
});

export const TrackingDataSchema = z.object({
  datahora: z.string(),
  historico: z.array(TrackingHistoryEventSchema),
  normalizado_datahora: z.string(),
  normalizado_previsao_entrega: z.string(),
  previsao_entrega: z.string().nullable(),
  situacao: z.string(),
  site_receipt: z.string(),
});

export const InfoSimplesApiResponseSchema = z.object({
  code: z.number(),
  code_message: z.string(),
  header: z.object({
    api_version: z.string(),
    api_version_full: z.string(),
    product: z.string(),
    service: z.string(),
    parameters: z.object({
      tracking_code: z.string(),
    }),
    client_name: z.string(),
    token_name: z.string(),
    billable: z.boolean(),
    price: z.string(),
    requested_at: z.string(),
    elapsed_time_in_milliseconds: z.number(),
    remote_ip: z.string(),
    signature: z.string(),
  }),
  data_count: z.number(),
  data: z.array(TrackingDataSchema),
  errors: z.array(z.string()),
  site_receipts: z.array(z.string()),
});
