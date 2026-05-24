import React, { useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ScannerScreen } from "./src/screens/ScannerScreen";

export default function App() {
  const [token, setToken] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />
      {token ? <ScannerScreen token={token} onLogout={() => setToken(null)} /> : <LoginScreen onAuthenticated={setToken} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#03030a"
  }
});
