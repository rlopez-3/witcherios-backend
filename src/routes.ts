import { Router } from "express";
import { productRouter } from "./modules/products/product.routes";
import { readingRouter } from "./modules/readings/reading.routes";
import { ritualRouter } from "./modules/rituals/ritual.routes";
import { userRouter } from "./modules/users/user.routes";
import {
  createCheckoutSession,
  getCheckoutSession,
} from "@shared/controllers/checkout.controller";
import { handleOnvoWebhook } from "@/shared/controllers/webhook.controller";

export const globalRouter = Router();

globalRouter.use("/products", productRouter);
globalRouter.use("/readings", readingRouter);
globalRouter.use("/rituals", ritualRouter);
globalRouter.use("/users", userRouter);

// Rutas de Checkout
globalRouter.post("/checkout-session", createCheckoutSession);
globalRouter.get("/checkout-session/:orderId", getCheckoutSession);

// Webhook de confirmación de pago
globalRouter.post("/webhooks/onvo", handleOnvoWebhook);
