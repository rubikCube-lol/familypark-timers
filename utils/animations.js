import { Animated, Easing } from "react-native";

// Fade + scale IN (bienvenida, reporte)
export const animateIn = (fade, scale, duration = 400) => {
  Animated.parallel([
    Animated.timing(fade, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }),
  ]).start();
};

// Fade + scale OUT (al cerrar)
export const animateOut = (fade, scale, duration = 250, callback = () => {}) => {
  Animated.parallel([
    Animated.timing(fade, {
      toValue: 0,
      duration,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }),
    Animated.timing(scale, {
      toValue: 0.85,
      duration,
      useNativeDriver: true,
    }),
  ]).start(() => callback());
};

// Slide IN (para bottom sheets)
export const slideIn = (slideAnim, screenHeight) => {
  Animated.spring(slideAnim, {
    toValue: screenHeight * 0.15,
    useNativeDriver: false,
    friction: 7,
  }).start();
};

// Slide OUT (cerrar bottom sheet)
export const slideOut = (slideAnim, screenHeight, callback = () => {}) => {
  Animated.timing(slideAnim, {
    toValue: screenHeight,
    duration: 250,
    useNativeDriver: false,
  }).start(() => callback());
};
