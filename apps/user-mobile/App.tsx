import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import { AuthScreen } from "./src/screens/AuthScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { getOfflineManifest } from "./src/lib/api";
import { getManifest, getOrders, getToken, saveManifest } from "./src/lib/storage";
import type { LocalOrder, OfflineManifest } from "./src/lib/types";

const emptyManifest: OfflineManifest = {
  generatedAt: new Date().toISOString(),
  events: [],
  products: [],
  policy: {
    chatEnabledForUsers: false,
    localNetworkMode: true,
    syncTarget: "/api/commerce/sync"
  }
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [manifest, setManifestState] = useState<OfflineManifest>(emptyManifest);
  const [orders, setOrders] = useState<LocalOrder[]>([]);

  async function bootstrap() {
    setLoading(true);
    const savedToken = await getToken();
    const savedManifest = await getManifest();
    const savedOrders = await getOrders();
    setOrders(savedOrders);

    if (savedManifest) setManifestState(savedManifest);
    if (savedToken) {
      setToken(savedToken);
      try {
        const fresh = await getOfflineManifest(savedToken);
        await saveManifest(fresh);
        setManifestState(fresh);
      } catch {
        setManifestState(savedManifest ?? emptyManifest);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    bootstrap();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loading}>
          <ActivityIndicator color="#00d4ff" size="large" />
          <Text style={styles.loadingText}>Preparando modo offline...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />
      {token ? (
        <HomeScreen token={token} initialManifest={manifest} initialOrders={orders} onLogout={() => setToken(null)} />
      ) : (
        <AuthScreen
          onReady={(nextToken) => {
            setToken(nextToken);
            bootstrap();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#03030a" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: "rgba(255,255,255,.7)", marginTop: 16, fontWeight: "800" }
});
