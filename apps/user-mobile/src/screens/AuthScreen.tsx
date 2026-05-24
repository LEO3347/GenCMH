import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Sparkles } from "lucide-react-native";
import { ApiError, login, register } from "../lib/api";
import { saveToken } from "../lib/storage";

export function AuthScreen({ onReady }: { onReady: (token: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("fan@gen.mx");
  const [name, setName] = useState("Fan GEN");
  const [password, setPassword] = useState("GenDemo123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const result = mode === "login" ? await login(email, password) : await register(email, password, name);
      await saveToken(result.token);
      onReady(result.token);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setError("Email o password incorrectos. Para demo usa fan@gen.mx / GenDemo123!.");
      } else if (error instanceof ApiError && error.status === 409) {
        setError("Ese email ya existe. Cambia a Entrar o usa otro correo.");
      } else {
        setError("No se pudo conectar con la API. Revisa que la URL del API responda desde el celular.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.badge}><Sparkles color="#00d4ff" size={30} /></View>
      <Text style={styles.title}>GEN</Text>
      <Text style={styles.subtitle}>Tu pase, tus eventos y tus compras express incluso cuando la fiesta no tiene internet.</Text>
      {mode === "register" ? <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor="#7b8194" value={name} onChangeText={setName} /> : null}
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#7b8194" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#7b8194" secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#03030a" /> : <Text style={styles.buttonText}>{mode === "login" ? "Entrar" : "Crear cuenta"}</Text>}
      </Pressable>
      <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")}>
        <Text style={styles.switch}>{mode === "login" ? "Crear cuenta nueva" : "Ya tengo cuenta"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#03030a" },
  badge: { width: 68, height: 68, borderRadius: 18, backgroundColor: "rgba(0,212,255,.12)", borderWidth: 1, borderColor: "rgba(0,212,255,.4)", alignItems: "center", justifyContent: "center" },
  title: { color: "white", fontSize: 64, fontWeight: "900", marginTop: 24 },
  subtitle: { color: "rgba(255,255,255,.66)", fontSize: 16, lineHeight: 25, marginBottom: 28 },
  input: { color: "white", padding: 16, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,.14)", backgroundColor: "rgba(255,255,255,.08)", marginBottom: 12 },
  error: { color: "#ff6b9f", marginBottom: 12 },
  button: { backgroundColor: "#00d4ff", borderRadius: 10, padding: 16, alignItems: "center" },
  buttonText: { color: "#03030a", fontWeight: "900" },
  switch: { color: "#ff2bd6", textAlign: "center", marginTop: 20, fontWeight: "800" }
});
