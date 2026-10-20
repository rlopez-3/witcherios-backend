import { Request, Response } from "express";
import crypto from "crypto";
import { db } from "@/config/firebase";
import { RedisService } from "@/shared/services/redis.service";
import { ProductRepository } from "@/modules/products/repository/product.repository";

const productRepo = new ProductRepository();
const ONVO_WEBHOOK_SECRET = process.env.ONVO_WEBHOOK_SECRET!;

export const handleOnvoWebhook = async (req: Request, res: Response) => {
  const signature = req.headers["x-onvo-signature"] as string;
  const rawBody = (req as any).rawBody;

  // 1. Validar Firma HMAC-SHA256
  const hmac = crypto.createHmac("sha256", ONVO_WEBHOOK_SECRET);
  const digest = hmac.update(rawBody).digest("hex");

  if (signature !== digest) {
    console.error("Firma de Webhook ONVO inválida");
    return res.status(401).send("Firma no válida");
  }

  const event = req.body;
  const eventId = event.id;

  // 2. Control de Idempotencia en Redis
  const isFirstTime = await RedisService.setWebhookProcessed(eventId);
  if (!isFirstTime) {
    return res.status(200).json({ status: "already_processed" });
  }

  // 3. Manejo de Eventos
  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data;
      const orderId = paymentIntent.metadata?.orderId;

      if (orderId) {
        // Transacción Atómica en Firestore para inventario y estado
        await db.runTransaction(async (transaction) => {
          const orderRef = db.collection("orders").doc(orderId);
          const orderDoc = await transaction.get(orderRef);

          if (!orderDoc.exists) throw new Error(`Orden ${orderId} no existe.`);

          const orderData = orderDoc.data()!;
          if (orderData.status !== "pending_payment") return;

          // Decrementar inventario real en Firestore
          for (const item of orderData.items) {
            const productRef = db.collection("products").doc(item.productId);
            transaction.update(productRef, {
              stock: FirebaseFirestore.FieldValue.increment(-item.quantity),
            });
          }

          transaction.update(orderRef, {
            status: "processing",
            updatedAt: new Date(),
          });
        });

        // Purgar la caché de productos en Redis para que el stock actualizado se refresque en la siguiente lectura[cite: 2]
        await productRepo.invalidateCache();
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data;
      const orderId = paymentIntent.metadata?.orderId;

      if (orderId) {
        await db.collection("orders").doc(orderId).update({
          status: "payment_failed",
          updatedAt: new Date(),
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("Error procesando Webhook ONVO:", err);
    return res.status(500).send("Webhook processing error");
  }
};
