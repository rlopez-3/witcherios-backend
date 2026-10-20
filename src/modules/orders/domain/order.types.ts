import {
  SupportedCurrency,
  SupportedLocale,
  LocalizedString,
} from "@/modules/products/domain/product.types";

export type OrderStatus =
  | "pending_payment"
  | "payment_failed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface ShippingDetails {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  estimatedDelivery?: string;
}

export interface OrderItem {
  productId: string;
  title: string; // Nombre guardado en el idioma de la compra
  price: number; // Precio snapshot en la moneda seleccionada
  currency: SupportedCurrency;
  quantity: number;
  image?: string | null;
}

export interface OrderDocument {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: SupportedCurrency;
  locale: SupportedLocale;
  status: OrderStatus;
  onvoPaymentIntentId: string;
  shippingDetails?: ShippingDetails;
  createdAt: Date;
  updatedAt: Date;
}
