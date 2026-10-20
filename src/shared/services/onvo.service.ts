import axios from "axios";

const ONVO_SECRET_KEY = process.env.ONVO_SECRET_KEY!;
const ONVO_API_URL = process.env.ONVO_API_URL || "https://api.onvopay.com/v1";

export interface CreatePaymentIntentParams {
  amount: number;
  currency: "CRC" | "USD";
  description: string;
  metadata: Record<string, string>;
  customerEmail?: string;
}

export class OnvoService {
  private static client = axios.create({
    baseURL: ONVO_API_URL,
    headers: {
      Authorization: `Bearer ${ONVO_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 10000,
  });

  static async createPaymentIntent(
    params: CreatePaymentIntentParams,
    retries = 2,
  ) {
    const payload = {
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      captureMethod: "automatic",
      metadata: params.metadata,
    };

    console.log("[OnvoService] Enviando solicitud a API de ONVO:", {
      endpoint: `${ONVO_API_URL}/payment-intents`,
      payload,
    });

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.client.post("/payment-intents", payload);
        console.log("[OnvoService] Intención de pago creada exitosamente:", {
          id: response.data?.id,
          status: response.data?.status,
        });
        return response.data;
      } catch (error: any) {
        const status = error.response?.status;

        if (
          (status === 502 || status === 503 || status === 504) &&
          attempt < retries
        ) {
          console.warn(
            `[OnvoService] Fallo temporal (${status}). Reintento ${attempt + 1}/${retries} en 2s...`,
          );
          await new Promise((res) => setTimeout(res, 2000));
          continue;
        }

        console.error("[OnvoService] Error al comunicar con ONVO API:", {
          status,
          responseData: error.response?.data,
          message: error.message,
        });
        throw new Error("Error al conectar con la pasarela de pago ONVO.");
      }
    }
  }
}
