import Constants from "expo-constants";

const apiUrl = Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:4000";

export async function login(email: string, password: string) {
  const res = await fetch(`${apiUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error("Credenciales invalidas");
  return res.json() as Promise<{ token: string }>;
}

export async function validateScan(input: {
  token: string;
  qrToken: string;
  deviceId: string;
  latitude?: number;
  longitude?: number;
}) {
  const res = await fetch(`${apiUrl}/api/scans/validate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.token}`
    },
    body: JSON.stringify({
      token: input.qrToken,
      deviceId: input.deviceId,
      latitude: input.latitude,
      longitude: input.longitude
    })
  });
  return res.json();
}

export async function syncOfflineScans(input: {
  token: string;
  deviceId: string;
  scans: Array<{
    token: string;
    deviceId: string;
    scannedAt: string;
    latitude?: number;
    longitude?: number;
  }>;
}) {
  const res = await fetch(`${apiUrl}/api/scans/sync`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.token}`
    },
    body: JSON.stringify({
      deviceId: input.deviceId,
      scans: input.scans
    })
  });
  if (!res.ok) throw new Error("sync_failed");
  return res.json();
}
