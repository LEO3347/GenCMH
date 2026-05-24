import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

export function GlowCard(props: ViewProps) {
  return <View {...props} style={[styles.card, props.style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,.08)",
    borderColor: "rgba(255,255,255,.14)",
    borderWidth: 1,
    borderRadius: 10
  }
});
