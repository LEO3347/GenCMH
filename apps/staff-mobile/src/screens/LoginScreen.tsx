import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { login } from "../api";

export function LoginScreen({ onAuthenticated }: { onAuthenticated: (token: string) => void }) {
  const [email, setEmail] = useState("staff@gen.mx");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const result = await login(email, password);
      onAuthenticated(result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de acceso");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.logo}>
        <ShieldCheck color="#00d4ff" size={34} />
      </View>
      <Text style={styles.title}>GEN Staff</Text>
      <Text style={styles.subtitle}>Acceso privado para validacion de boletos y control de puerta.</Text>
      <TextInput style={styles.input} placeholder="Email staff" placeholderTextColor="#6b7280" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#6b7280" secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#03030a" /> : <Text style={styles.buttonText}>Entrar seguro</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: "center" },
  logo: { width: 68, height: 68, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,212,255,.12)", borderWidth: 1, borderColor: "rgba(0,212,255,.35)" },
  title: { color: "white", fontSize: 42, fontWeight: "900", marginTop: 26 },
  subtitle: { color: "rgba(255,255,255,.62)", fontSize: 16, lineHeight: 24, marginTop: 10, marginBottom: 30 },
  input: { color: "white", backgroundColor: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.13)", borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 12 },
  error: { color: "#ff6b9f", marginBottom: 12 },
  button: { backgroundColor: "#00d4ff", borderRadius: 8, padding: 16, alignItems: "center" },
  buttonText: { color: "#03030a", fontWeight: "900" }
});
