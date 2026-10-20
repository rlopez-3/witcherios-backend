import { Request, Response } from "express";
import { db } from "@/config/firebase";
import { OnvoService } from "@/shared/services/onvo.service";
import { RedisService } from "@/shared/services/redis.service";
import { ProductRepository } from "@/modules/products/repository/product.repository";
import {
  SupportedCurrency,
  SupportedLocale,
} from "@/modules/products/domain/product.types";
import { OrderItem } from "@/modules/orders/domain/order.types";

const productRepo = new ProductRepository();

/**
 * Helper interno: Valida stock en el catálogo, precios por moneda y calcula subtotales e impuestos.
 */
async function validateAndCalculate(
  items: Array<{ productId: string; quantity: number }>,
  currency: SupportedCurrency = "CRC",
  locale: SupportedLocale = "es",
) {
  const catalog = await productRepo.getAll();
  const productMap = new Map(catalog.map((p) => [p.id, p]));
  let subtotal = 0;
  const validatedItems: OrderItem[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product || !product.active) {
      throw new Error(
        `El producto ID '${item.productId}' no existe o está deshabilitado.`,
      );
    }

    const currentStock = product.stock ?? 0;
    if (currentStock < item.quantity) {
      const productName =
        typeof product.name === "string"
          ? product.name
          : product.name[locale] || product.name.es;
      throw new Error(`Stock insuficiente para: ${productName}`);
    }

    const unitPrice = product.prices[currency];
    if (unitPrice === undefined || unitPrice <= 0) {
      throw new Error(`Precio no configurado para la moneda ${currency}.`);
    }

    subtotal += unitPrice * item.quantity;
    validatedItems.push({
      productId: product.id,
      title:
        typeof product.name === "string"
          ? product.name
          : product.name[locale] || product.name.es,
      price: unitPrice,
      currency,
      quantity: item.quantity,
    });
  }

  const taxRate = 0.13;
  const tax =
    currency === "CRC"
      ? Math.round(subtotal * taxRate)
      : Number((subtotal * taxRate).toFixed(2));
  const total = subtotal + tax;

  return { subtotal, tax, total, validatedItems };
}

/**
 * POST /api/v1/checkout-session
 * Crea o actualiza una orden pendiente y genera la intención de pago en ONVO.
 */
export const createCheckoutSession = async (req: Request, res: Response) => {
  const {
    userId,
    items,
    currency = "CRC",
    locale = "es",
    customerEmail,
  } = req.body as {
    userId: string;
    items: Array<{ productId: string; quantity: number }>;
    currency?: SupportedCurrency;
    locale?: SupportedLocale;
    customerEmail?: string;
  };

  if (!userId || !items || items.length === 0) {
    return res
      .status(400)
      .json({ error: "Faltan parámetros requeridos (userId, items)." });
  }

  // Prevención de doble clic (Mutex distribuido en Redis)
  const lockKey = `lock:checkout:${userId}`;
  const acquiredLock = await RedisService.acquireLock(lockKey, 5);
  if (!acquiredLock) {
    return res
      .status(429)
      .json({ error: "Procesando una solicitud activa. Por favor espere..." });
  }

  try {
    // 1. Buscar si el usuario ya tiene una orden en borrador activa (< 15 min)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const existingOrdersSnapshot = await db
      .collection("orders")
      .where("userId", "==", userId)
      .where("status", "==", "pending_payment")
      .where("createdAt", ">=", fifteenMinutesAgo)
      .limit(1)
      .get();

    let orderId: string;
    let isExisting = false;

    if (!existingOrdersSnapshot.empty) {
      const activeDoc = existingOrdersSnapshot.docs[0];
      orderId = activeDoc.id;
      isExisting = true;

      // Liberar bloqueos de stock anteriores en Redis para esta orden
      const oldData = activeDoc.data();
      for (const oldItem of oldData.items || []) {
        await RedisService.releaseLock(
          `stock:hold:${oldItem.productId}:${orderId}`,
        );
      }
    } else {
      const orderRef = db.collection("orders").doc();
      orderId = orderRef.id;
    }

    // 2. Validar inventario y precios reales del catálogo
    const { subtotal, tax, total, validatedItems } = await validateAndCalculate(
      items,
      currency,
      locale,
    );

    // 3. Crear intension de pago en ONVO Pay (monto en centavos/céntimos)
    const paymentAmount = Math.round(total * 100);
    const paymentIntent = await OnvoService.createPaymentIntent({
      amount: paymentAmount,
      currency,
      description: `Orden #${orderId}`,
      customerEmail,
      metadata: { orderId, userId },
    });

    // 4. Guardar o actualizar la orden en Firestore
    const orderPayload = {
      id: orderId,
      userId,
      items: validatedItems,
      subtotal,
      tax,
      total,
      currency,
      status: "pending_payment",
      onvoPaymentIntentId: paymentIntent.id,
      updatedAt: new Date(),
      ...(isExisting ? {} : { createdAt: new Date() }),
    };

    await db
      .collection("orders")
      .doc(orderId)
      .set(orderPayload, { merge: true });

    // 5. Reservar stock temporalmente en Redis (TTL 15 minutos = 900 segundos)
    for (const item of validatedItems) {
      await RedisService.acquireLock(
        `stock:hold:${item.productId}:${orderId}`,
        900,
      );
    }

    return res.status(200).json({
      orderId,
      paymentIntentId: paymentIntent.id,
      total,
      currency,
    });
  } catch (error: any) {
    return res
      .status(400)
      .json({ error: error.message || "Error al procesar el checkout." });
  } finally {
    await RedisService.releaseLock(lockKey);
  }
};

/**
 * GET /api/v1/checkout-session/:orderId
 * Consulta idempotente para montar la pasarela al refrescar la página sin modificar la BD.
 */
export const getCheckoutSession = async (req: Request, res: Response) => {
  const params = req.params;
  const orderId = Array.isArray(params?.orderId)
    ? params.orderId[0]
    : (params?.orderId as string);
  try {
    const orderDoc = await db.collection("orders").doc(orderId).get();

    if (!orderDoc.exists) {
      return res
        .status(404)
        .json({ error: "La orden especificada no existe." });
    }

    const data = orderDoc.data()!;

    if (data.status !== "pending_payment") {
      return res
        .status(400)
        .json({ error: "Esta orden ya fue procesada o cancelada." });
    }

    return res.status(200).json({
      orderId: data.id,
      paymentIntentId: data.onvoPaymentIntentId,
      total: data.total,
      currency: data.currency,
      items: data.items,
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Error al obtener la sesión de checkout." });
  }
};
