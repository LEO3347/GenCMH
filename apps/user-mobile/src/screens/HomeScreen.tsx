import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Crown, Gift, LogOut, QrCode, RefreshCw, ShoppingBag, Ticket } from "lucide-react-native";
import { GlowCard } from "../components/GlowCard";
import { getOfflineManifest, getRewards, getTableMap, holdTable, syncOrders } from "../lib/api";
import { addOrder, clearToken, getDeviceId, getOrders, saveManifest, saveOrders } from "../lib/storage";
import type { GenEvent, LocalOrder, OfflineManifest, Product, Reward, VenueTable } from "../lib/types";
import { money } from "../lib/money";

type Tab = "events" | "shop" | "tables" | "orders" | "rewards";

export function HomeScreen({
  token,
  initialManifest,
  initialOrders,
  onLogout
}: {
  token: string;
  initialManifest: OfflineManifest;
  initialOrders: LocalOrder[];
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>("events");
  const [manifest, setManifest] = useState(initialManifest);
  const [selectedEventId, setSelectedEventId] = useState(initialManifest.events[0]?.id ?? "");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState(initialOrders);
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [syncing, setSyncing] = useState(false);

  const selectedEvent = manifest.events.find((event) => event.id === selectedEventId) ?? manifest.events[0];
  const products = useMemo(() => manifest.products.filter((product) => product.event_id === selectedEvent?.id), [manifest.products, selectedEvent?.id]);
  const total = products.reduce((sum, product) => sum + (cart[product.id] ?? 0) * product.price_cents, 0);

  async function refreshManifest() {
    const fresh = await getOfflineManifest(token);
    await saveManifest(fresh);
    setManifest(fresh);
  }

  async function loadTables() {
    if (!selectedEvent) return;
    const result = await getTableMap(token, selectedEvent.id);
    setTables(result.tables);
  }

  async function loadRewards() {
    const result = await getRewards(token);
    setRewards(result.rewards);
  }

  async function reserveTable(tableId: string) {
    await holdTable(token, tableId);
    await loadTables();
  }

  function changeQty(product: Product, delta: number) {
    setCart((current) => {
      const next = Math.max(0, Math.min(product.stock, (current[product.id] ?? 0) + delta));
      return { ...current, [product.id]: next };
    });
  }

  async function placeOfflineOrder() {
    if (!selectedEvent || total === 0) return;
    const deviceId = await getDeviceId();
    const order: LocalOrder = {
      clientOrderId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      eventId: selectedEvent.id,
      deviceId,
      offlineCreatedAt: new Date().toISOString(),
      items: Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([productId, quantity]) => ({ productId, quantity })),
      status: "queued_offline",
      totalCents: total,
      pickupCode: `LOCAL-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    };
    await addOrder(order);
    setOrders([order, ...orders]);
    setCart({});
    setTab("orders");
  }

  async function syncQueuedOrders() {
    setSyncing(true);
    try {
      const deviceId = await getDeviceId();
      const current = await getOrders();
      const response = await syncOrders(token, deviceId, current);
      const acceptedIds = new Set(response.accepted.map((item) => item.order.client_order_id));
      const rejected = new Map(response.rejected.map((item) => [item.clientOrderId, item.reason]));
      const updated = current.map((order) => {
        const accepted = response.accepted.find((item) => item.order.client_order_id === order.clientOrderId);
        if (acceptedIds.has(order.clientOrderId)) {
          return { ...order, status: "synced" as const, pickupCode: accepted?.order.pickup_code ?? order.pickupCode, pickupQrImage: accepted?.pickupQr.image };
        }
        if (rejected.has(order.clientOrderId)) {
          return { ...order, status: "rejected" as const, rejectionReason: rejected.get(order.clientOrderId) };
        }
        return order;
      });
      await saveOrders(updated);
      setOrders(updated);
      await refreshManifest();
    } finally {
      setSyncing(false);
    }
  }

  async function logout() {
    await clearToken();
    onLogout();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>GEN USER</Text>
          <Text style={styles.title}>{selectedEvent?.title ?? "Eventos"}</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={logout}><LogOut color="white" size={20} /></Pressable>
      </View>

      <View style={styles.tabs}>
        <TabButton active={tab === "events"} label="Eventos" icon={<Ticket size={17} color={tab === "events" ? "#03030a" : "white"} />} onPress={() => setTab("events")} />
        <TabButton active={tab === "shop"} label="Pick-up" icon={<ShoppingBag size={17} color={tab === "shop" ? "#03030a" : "white"} />} onPress={() => setTab("shop")} />
        <TabButton active={tab === "tables"} label="Mesas" icon={<Crown size={17} color={tab === "tables" ? "#03030a" : "white"} />} onPress={() => { setTab("tables"); loadTables(); }} />
        <TabButton active={tab === "orders"} label="Compras" icon={<RefreshCw size={17} color={tab === "orders" ? "#03030a" : "white"} />} onPress={() => setTab("orders")} />
        <TabButton active={tab === "rewards"} label="VIP" icon={<Gift size={17} color={tab === "rewards" ? "#03030a" : "white"} />} onPress={() => { setTab("rewards"); loadRewards(); }} />
      </View>

      {tab === "events" ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.status}><Text style={styles.statusText}>Modo offline listo · Chat no disponible para usuarios</Text></View>
          {manifest.events.map((event) => <EventRow key={event.id} event={event} active={event.id === selectedEvent?.id} onPress={() => setSelectedEventId(event.id)} />)}
        </ScrollView>
      ) : null}

      {tab === "shop" ? (
        <View style={styles.flex}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {products.map((product) => (
              <GlowCard key={product.id} style={styles.product}>
                {product.image_url ? <Image source={{ uri: product.image_url }} style={styles.productImage} /> : null}
                <View style={styles.productBody}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.muted}>{product.description}</Text>
                  <Text style={styles.price}>{money(product.price_cents, product.currency)}</Text>
                  <View style={styles.qtyRow}>
                    <Pressable style={styles.qtyButton} onPress={() => changeQty(product, -1)}><Text style={styles.qtyText}>-</Text></Pressable>
                    <Text style={styles.qtyNumber}>{cart[product.id] ?? 0}</Text>
                    <Pressable style={styles.qtyButton} onPress={() => changeQty(product, 1)}><Text style={styles.qtyText}>+</Text></Pressable>
                  </View>
                </View>
              </GlowCard>
            ))}
          </ScrollView>
          <Pressable style={[styles.checkout, total === 0 ? styles.disabled : null]} onPress={placeOfflineOrder} disabled={total === 0}>
            <Text style={styles.checkoutText}>Ordenar sin fila · {money(total)}</Text>
          </Pressable>
        </View>
      ) : null}

      {tab === "tables" ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <GlowCard style={styles.map}>
            <Text style={styles.productName}>Mapa VIP interactivo</Text>
            <Text style={styles.muted}>Elige mesa, aparta y divide pago con amigos.</Text>
            {tables.map((table) => (
              <Pressable key={table.id} style={[styles.tableDot, table.status !== "available" ? styles.tableTaken : null]} onPress={() => table.status === "available" ? reserveTable(table.id) : undefined}>
                <Text style={styles.tableLabel}>{table.label}</Text>
                <Text style={styles.tablePrice}>{money(table.min_spend_cents)}</Text>
              </Pressable>
            ))}
          </GlowCard>
          <GlowCard style={styles.qrCard}>
            <QrCode color="#00d4ff" size={88} />
            <Text style={styles.qrTitle}>QR unico GEN</Text>
            <Text style={styles.mutedCenter}>Tu pase, compras y reservas viven en un token temporal cifrado.</Text>
          </GlowCard>
        </ScrollView>
      ) : null}

      {tab === "orders" ? (
        <View style={styles.flex}>
          <Pressable style={styles.syncButton} onPress={syncQueuedOrders} disabled={syncing}>
            <Text style={styles.syncText}>{syncing ? "Sincronizando..." : "Sincronizar por red local"}</Text>
          </Pressable>
          <ScrollView showsVerticalScrollIndicator={false}>
            {orders.map((order) => (
              <GlowCard key={order.clientOrderId} style={styles.order}>
                <Text style={styles.productName}>{order.pickupCode}</Text>
                <Text style={styles.muted}>{order.status === "queued_offline" ? "Pendiente offline" : order.status === "synced" ? "Centralizado en cuenta principal" : `Rechazado: ${order.rejectionReason}`}</Text>
                <Text style={styles.price}>{money(order.totalCents)}</Text>
                {order.pickupQrImage ? <Image source={{ uri: order.pickupQrImage }} style={styles.qrImage} /> : null}
              </GlowCard>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {tab === "rewards" ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {rewards.length === 0 ? <Text style={styles.mutedCenter}>Tus puntos GEN, cashback, insignias y misiones apareceran aqui.</Text> : null}
          {rewards.map((reward) => (
            <GlowCard key={reward.id} style={styles.order}>
              <Text style={styles.productName}>{reward.title}</Text>
              <Text style={styles.muted}>{reward.description}</Text>
              <Text style={styles.price}>{reward.points} puntos GEN</Text>
            </GlowCard>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function TabButton({ active, label, icon, onPress }: { active: boolean; label: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable style={[styles.tab, active ? styles.tabActive : null]} onPress={onPress}>
      {icon}
      <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function EventRow({ event, active, onPress }: { event: GenEvent; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <GlowCard style={[styles.event, active ? styles.eventActive : null]}>
        {event.cover_url ? <Image source={{ uri: event.cover_url }} style={styles.eventImage} /> : null}
        <View style={styles.eventBody}>
          <Text style={styles.productName}>{event.title}</Text>
          <Text style={styles.muted}>{event.venue_name} · {event.city}</Text>
          <Text style={styles.kicker}>{event.vip ? "VIP EXPERIENCE" : "GENERAL ACCESS"}</Text>
        </View>
      </GlowCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: "#03030a" },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  kicker: { color: "#00d4ff", fontSize: 11, fontWeight: "900", letterSpacing: 3 },
  title: { color: "white", fontSize: 28, fontWeight: "900", maxWidth: 300 },
  iconButton: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.1)" },
  tabs: { flexDirection: "row", gap: 7, marginBottom: 14 },
  tab: { flex: 1, minHeight: 46, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.08)" },
  tabActive: { backgroundColor: "#00d4ff" },
  tabText: { color: "white", fontSize: 10, fontWeight: "800", marginTop: 3 },
  tabTextActive: { color: "#03030a" },
  status: { padding: 12, borderRadius: 10, backgroundColor: "rgba(199,255,61,.1)", marginBottom: 12 },
  statusText: { color: "#c7ff3d", fontWeight: "800" },
  event: { flexDirection: "row", overflow: "hidden", marginBottom: 12 },
  eventActive: { borderColor: "rgba(0,212,255,.65)" },
  eventImage: { width: 112, minHeight: 132 },
  eventBody: { flex: 1, padding: 14, justifyContent: "center" },
  product: { flexDirection: "row", overflow: "hidden", marginBottom: 12 },
  productImage: { width: 104, minHeight: 142 },
  productBody: { flex: 1, padding: 14 },
  productName: { color: "white", fontSize: 17, fontWeight: "900" },
  muted: { color: "rgba(255,255,255,.58)", marginTop: 5, lineHeight: 20 },
  price: { color: "#c7ff3d", fontWeight: "900", fontSize: 18, marginTop: 10 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  qtyButton: { width: 34, height: 34, borderRadius: 8, backgroundColor: "rgba(255,255,255,.14)", alignItems: "center", justifyContent: "center" },
  qtyText: { color: "white", fontSize: 22, fontWeight: "900" },
  qtyNumber: { color: "white", fontWeight: "900", minWidth: 24, textAlign: "center" },
  checkout: { backgroundColor: "#ff2bd6", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 8 },
  disabled: { opacity: 0.4 },
  checkoutText: { color: "white", fontWeight: "900" },
  center: { flex: 1, justifyContent: "center" },
  qrCard: { alignItems: "center", padding: 28 },
  map: { minHeight: 360, padding: 16, marginBottom: 12 },
  tableDot: { marginTop: 12, borderRadius: 10, padding: 14, backgroundColor: "rgba(0,212,255,.14)", borderWidth: 1, borderColor: "rgba(0,212,255,.4)" },
  tableTaken: { backgroundColor: "rgba(255,77,109,.12)", borderColor: "rgba(255,77,109,.42)" },
  tableLabel: { color: "white", fontWeight: "900" },
  tablePrice: { color: "#c7ff3d", marginTop: 4, fontWeight: "900" },
  qrTitle: { color: "white", fontSize: 24, fontWeight: "900", marginTop: 18 },
  mutedCenter: { color: "rgba(255,255,255,.6)", textAlign: "center", lineHeight: 22, marginTop: 10 },
  syncButton: { backgroundColor: "#00d4ff", borderRadius: 10, padding: 14, alignItems: "center", marginBottom: 12 },
  syncText: { color: "#03030a", fontWeight: "900" },
  order: { padding: 16, marginBottom: 12 },
  qrImage: { width: 164, height: 164, marginTop: 14, borderRadius: 8, backgroundColor: "white" }
});
