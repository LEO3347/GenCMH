export type TicketTier = "general" | "vip" | "backstage";
export type TicketStatus = "issued" | "reserved" | "used" | "cancelled" | "refunded";
export type PaymentProvider = "stripe" | "paypal" | "mercadopago";
export type UserRole = "guest" | "organizer" | "staff" | "admin" | "super_admin";

export interface EventSummary {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  venueName: string;
  city: string;
  coverUrl: string;
  minPrice: number;
  vip: boolean;
  trendingScore: number;
}

export interface QrScanPayload {
  token: string;
  deviceId: string;
  staffUserId: string;
  latitude?: number;
  longitude?: number;
}

export interface CommerceProduct {
  id: string;
  eventId: string;
  name: string;
  description: string;
  category: "bebidas" | "snacks" | "merch" | "vip";
  priceCents: number;
  currency: string;
  stock: number;
  pickupZone: string;
}

export interface OfflinePickupOrder {
  clientOrderId: string;
  eventId: string;
  deviceId: string;
  offlineCreatedAt: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface OfflineManifestPolicy {
  chatEnabledForUsers: false;
  localNetworkMode: true;
  syncTarget: "/api/commerce/sync";
}
