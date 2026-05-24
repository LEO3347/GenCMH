export interface GenEvent {
  id: string;
  title: string;
  slug: string;
  venue_name: string;
  city: string;
  starts_at: string;
  cover_url?: string;
  vip: boolean;
  trending_score: number;
}

export interface Product {
  id: string;
  event_id: string;
  name: string;
  description: string;
  category: string;
  image_url?: string;
  price_cents: number;
  currency: string;
  stock: number;
  pickup_zone: string;
}

export interface LocalOrder {
  clientOrderId: string;
  eventId: string;
  deviceId: string;
  offlineCreatedAt: string;
  items: Array<{ productId: string; quantity: number }>;
  status: "queued_offline" | "synced" | "rejected";
  totalCents: number;
  pickupCode: string;
  pickupQrImage?: string;
  rejectionReason?: string;
}

export interface VenueTable {
  id: string;
  event_id: string;
  label: string;
  min_spend_cents: number;
  seats: number;
  status: "available" | "held" | "reserved" | "occupied" | "closed";
  position_x: string;
  position_y: string;
}

export interface Reward {
  id: string;
  reward_type: string;
  title: string;
  description: string;
  points: number;
  claimed_at?: string;
}

export interface OfflineManifest {
  generatedAt: string;
  events: GenEvent[];
  products: Product[];
  policy: {
    chatEnabledForUsers: false;
    localNetworkMode: boolean;
    syncTarget: string;
  };
}
