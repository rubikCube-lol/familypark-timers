import React from "react";
import { View, Animated, TouchableWithoutFeedback, Dimensions } from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function BottomSheet({ 
  visible, 
  slideAnim, 
  onClose, 
  children 
}) {
  if (!visible) return null;

  return (
    <View style={{
      position: "absolute",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
      zIndex: 50,
    }}>
      
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
      </TouchableWithoutFeedback>

      <Animated.View style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: slideAnim,
        height: SCREEN_HEIGHT * 0.85,
        backgroundColor: "#D8E2EB",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 20,
      }}>
        {children}
      </Animated.View>
    </View>
  );
}
