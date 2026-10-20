import { Request, Response } from "express";
import { db } from "@/config/firebase";
import { OrderStatus } from "./domain/order.types";

/**
 * Endpoint para actualizar el estado logístico
 */
export const updateOrderStatus = async (req: Request, res: Response) => {
  const rawOrderId = req.params.orderId || req.query.orderId;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

  if (!orderId || typeof orderId !== "string") {
    return res
      .status(400)
      .json({ error: "orderId es requerido y debe ser un texto válido." });
  }
  const { status, carrier, trackingNumber, trackingUrl, estimatedDelivery } =
    req.body;

  const validStatuses: OrderStatus[] = [
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Estado de orden no válido." });
  }

  try {
    const orderRef = db.collection("orders").doc(orderId);
    const updateData: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };

    if (status === "shipped") {
      updateData["shippingDetails.carrier"] = carrier || "Mensajería Express";
      updateData["shippingDetails.trackingNumber"] = trackingNumber || "";
      updateData["shippingDetails.trackingUrl"] = trackingUrl || "";
      updateData["shippingDetails.estimatedDelivery"] = estimatedDelivery || "";
      updateData["shippingDetails.shippedAt"] = new Date();
    } else if (status === "delivered") {
      updateData["shippingDetails.deliveredAt"] = new Date();
    }

    await orderRef.update(updateData);

    return res
      .status(200)
      .json({ success: true, message: `Orden actualizada a ${status}` });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error.message || "Error al actualizar estado." });
  }
};
