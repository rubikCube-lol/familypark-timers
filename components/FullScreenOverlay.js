import React from "react";
import { View, TouchableWithoutFeedback } from "react-native";

export default function FullScreenOverlay({ visible, onClose, children, style }) {
  if (!visible) return null;

  return (
    <View style={[{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.55)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
    }, style]}>
      
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      </TouchableWithoutFeedback>

      {children}
    </View>
  );
}
