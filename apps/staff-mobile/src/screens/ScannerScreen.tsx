import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";
import { LogOut, QrCode, ShieldAlert, ShieldCheck } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";
import { syncOfflineScans, validateScan } from "../api";

const BarcodeScannerView = BarCodeScanner as unknown as React.ComponentType<{
  onBarCodeScanned: ({ data }: { data: string }) => void;
  style?: object;
}>;
const LogOutIcon = LogOut as React.ComponentType<{ color?: string; size?: number }>;
const QrCodeIcon = QrCode as React.ComponentType<{ color?: string; size?: number }>;
const ShieldAlertIcon = ShieldAlert as React.ComponentType<{ color?: string; size?: number }>;
const ShieldCheckIcon = ShieldCheck as React.ComponentType<{ color?: string; size?: number }>;

interface QueuedScan {
  token: string;
  deviceId: string;
  scannedAt: string;
}

const queueKey = "gen.staff.offlineScans";

async function getQueue() {
  const value = await SecureStore.getItemAsync(queueKey);
  return value ? (JSON.parse(value) as QueuedScan[]) : [];
}

async function saveQueue(scans: QueuedScan[]) {
  await SecureStore.setItemAsync(queueKey, JSON.stringify(scans));
}

export function ScannerScreen({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [permission, requestPermission] = BarCodeScanner.usePermissions();
  const [locked, setLocked] = useState(false);
  const [last, setLast] = useState<any>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const deviceId = useMemo(() => `staff-${Math.random().toString(36).slice(2)}`, []);

  async function onScanned({ data }: { data: string }) {
    if (locked) return;
    setLocked(true);
    try {
      const result = await validateScan({ token, qrToken: data, deviceId });
      setLast(result);
      if (result.valid) {
        Alert.alert("Acceso aprobado", `${result.attendee?.name ?? "Invitado"} · ${result.attendee?.tier ?? "Ticket"}`);
      } else {
        Alert.alert("Acceso rechazado", result.reason ?? "QR invalido");
      }
    } catch {
      const queued = await getQueue();
      const next = [{ token: data, deviceId, scannedAt: new Date().toISOString() }, ...queued];
      await saveQueue(next);
      setQueuedCount(next.length);
      setLast({ valid: false, reason: "Guardado offline para sincronizar" });
    }
    setTimeout(() => setLocked(false), 1800);
  }

  async function syncQueue() {
    const queued = await getQueue();
    if (queued.length === 0) return;
    const result = await syncOfflineScans({ token, deviceId, scans: queued });
    await saveQueue([]);
    setQueuedCount(0);
    Alert.alert("Sync completa", `${result.accepted.length} aceptados · ${result.rejected.length} rechazados`);
  }

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <QrCodeIcon color="#00d4ff" size={56} />
        <Text style={styles.title}>Activar camara</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Permitir escaneo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>GEN STAFF</Text>
          <Text style={styles.title}>Scanner live</Text>
        </View>
        <Pressable onPress={onLogout} style={styles.iconButton}>
          <LogOutIcon color="white" size={22} />
        </Pressable>
      </View>
      <View style={styles.cameraWrap}>
        <BarcodeScannerView onBarCodeScanned={onScanned} style={StyleSheet.absoluteFillObject} />
        <View style={styles.reticle} />
      </View>
      <View style={[styles.result, last?.valid ? styles.accepted : last ? styles.rejected : null]}>
        {last?.valid ? <ShieldCheckIcon color="#c7ff3d" size={26} /> : <ShieldAlertIcon color={last ? "#ff4d6d" : "#00d4ff"} size={26} />}
        <View>
          <Text style={styles.resultTitle}>{last ? (last.valid ? "Acceso aprobado" : "QR rechazado") : "Listo para escanear"}</Text>
          <Text style={styles.resultText}>{last?.valid ? `${last.attendee?.name} · ${last.attendee?.tier}` : last?.reason ?? "Apunta al QR dinamico de GEN."}</Text>
        </View>
      </View>
      <Pressable style={styles.syncButton} onPress={syncQueue}>
        <Text style={styles.syncText}>Sincronizar offline {queuedCount > 0 ? `(${queuedCount})` : ""}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 18, backgroundColor: "#03030a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#03030a" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  kicker: { color: "#00d4ff", fontWeight: "900", letterSpacing: 4, fontSize: 12 },
  title: { color: "white", fontSize: 34, fontWeight: "900", marginTop: 4 },
  iconButton: { width: 46, height: 46, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.1)" },
  cameraWrap: { flex: 1, overflow: "hidden", borderRadius: 10, borderWidth: 1, borderColor: "rgba(0,212,255,.35)" },
  reticle: { position: "absolute", left: "12%", right: "12%", top: "26%", bottom: "26%", borderWidth: 2, borderColor: "#00d4ff", borderRadius: 8 },
  result: { flexDirection: "row", gap: 14, alignItems: "center", marginTop: 16, padding: 16, borderRadius: 8, backgroundColor: "rgba(255,255,255,.08)", borderWidth: 1, borderColor: "rgba(255,255,255,.12)" },
  accepted: { borderColor: "rgba(199,255,61,.6)", backgroundColor: "rgba(199,255,61,.1)" },
  rejected: { borderColor: "rgba(255,77,109,.6)", backgroundColor: "rgba(255,77,109,.1)" },
  resultTitle: { color: "white", fontWeight: "900", fontSize: 16 },
  resultText: { color: "rgba(255,255,255,.62)", marginTop: 3 },
  syncButton: { marginTop: 10, backgroundColor: "rgba(0,212,255,.16)", borderColor: "rgba(0,212,255,.45)", borderWidth: 1, borderRadius: 8, padding: 13, alignItems: "center" },
  syncText: { color: "#00d4ff", fontWeight: "900" },
  button: { marginTop: 22, backgroundColor: "#00d4ff", borderRadius: 8, paddingHorizontal: 18, paddingVertical: 14 },
  buttonText: { color: "#03030a", fontWeight: "900" }
});
