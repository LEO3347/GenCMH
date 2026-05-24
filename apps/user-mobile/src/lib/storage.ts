import * as SecureStore from "expo-secure-store";
import type { LocalOrder, OfflineManifest } from "./types";

const keys = {
  token: "gen.user.token",
  manifest: "gen.user.offlineManifest",
  orders: "gen.user.localOrders",
  deviceId: "gen.user.deviceId"
};

export async function getToken() {
  return SecureStore.getItemAsync(keys.token);
}

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(keys.token, token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(keys.token);
}

export async function getDeviceId() {
  const existing = await SecureStore.getItemAsync(keys.deviceId);
  if (existing) return existing;
  const created = `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await SecureStore.setItemAsync(keys.deviceId, created);
  return created;
}

export async function saveManifest(manifest: OfflineManifest) {
  await SecureStore.setItemAsync(keys.manifest, JSON.stringify(manifest));
}

export async function getManifest() {
  const value = await SecureStore.getItemAsync(keys.manifest);
  return value ? (JSON.parse(value) as OfflineManifest) : null;
}

export async function getOrders() {
  const value = await SecureStore.getItemAsync(keys.orders);
  return value ? (JSON.parse(value) as LocalOrder[]) : [];
}

export async function saveOrders(orders: LocalOrder[]) {
  await SecureStore.setItemAsync(keys.orders, JSON.stringify(orders));
}

export async function addOrder(order: LocalOrder) {
  const orders = await getOrders();
  await saveOrders([order, ...orders]);
}
