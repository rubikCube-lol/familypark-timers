import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  BackHandler,
  Animated,
  Easing,
} from "react-native";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

// Fondos
const bgInflables = require("../../assets/zones/bg-inflables.png");
const bgTrampoline = require("../../assets/zones/bg-trampoline.png");
const bgSoftPlay = require("../../assets/zones/bg-softplay.png");
const bgAutos = require("../../assets/zones/bg-autos.png");
const bgKinder = require("../../assets/zones/bg-softplay.png");

export default function ZonesScreen({ route, navigation }) {
  const { operatorId, operatorName, localId, zoneType } = route.params;

  // Card de bienvenida
  const [showWelcome, setShowWelcome] = useState(route.params?.welcomeShown ? false : true);

  // Animación
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.85))[0];

  useEffect(() => {
    if (showWelcome) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showWelcome]);

  // Bloquear botón atrás solo en Android
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const blockBack = () => true;
    BackHandler.addEventListener("hardwareBackPress", blockBack);

    return () => {
      BackHandler.removeEventListener("hardwareBackPress", blockBack);
    };
  }, []);

  const zonesA = [
    { name: "JUEGOS INFLABLES", code: "INFLA", bg: bgInflables },
    { name: "TRAMPOLINE ZONE", code: "TRAMP", bg: bgTrampoline },
    { name: "SOFT PLAY", code: "SOFT", bg: bgSoftPlay },
    { name: "AUTOS CHOCADORES", code: "AUTOS", bg: bgAutos },
  ];

  const zonesB = [
    { name: "KINDER ZONE", code: "KINDER", bg: bgKinder },
    { name: "TRAMPOLINE ZONE", code: "TRAMP", bg: bgTrampoline },
  ];

  const ZONES = zoneType === "A" ? zonesA : zonesB;

  return (
    <View style={styles.container}>

      {showWelcome && (
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.welcomeCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Text style={styles.welcomeTitle}>¡Bienvenido operador!</Text>

            <Text style={styles.welcomeSubtitle}>
              Ya puedes ingresar jugadores, ¡que te diviertas!
            </Text>

            <TouchableOpacity
              style={styles.welcomeButton}
              onPress={() => {
                // animación al cerrar
                Animated.parallel([
                  Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                  }),
                  Animated.timing(scaleAnim, {
                    toValue: 0.85,
                    duration: 250,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                  }),
                ]).start(() => {
                  setShowWelcome(false);

                  // marcar que ya se mostró en esta sesión
                  navigation.setParams({ welcomeShownPanel: true });
                });
              }}
            >
              <Text style={styles.welcomeButtonText}>CERRAR</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}


      {/* Overlay + Card Animada */}
      {showWelcome && (
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.welcomeCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Text style={styles.welcomeTitle}>
              ¡Bienvenido al sistema de operadores de Family Park!
            </Text>

            <Text style={styles.welcomeSubtitle}>
              Seleccione su zona para comenzar
            </Text>

            <TouchableOpacity
              style={styles.welcomeButton}
              onPress={() => {
                Animated.parallel([
                  Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                  }),
                  Animated.timing(scaleAnim, {
                    toValue: 0.85,
                    duration: 250,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                  })
                ]).start(() => {
                  setShowWelcome(false);

                  // marcamos que ya fue mostrada esta sesión
                  navigation.setParams({ welcomeShown: true });
                });
              }}
            >
              <Text style={styles.welcomeButtonText}>CERRAR</Text>
            </TouchableOpacity>

          </Animated.View>
        </View>
      )}

      <View style={styles.inner}>

        <Image
          source={require("../../assets/logo-familypark.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>SELECCIONE SU ZONA</Text>

        <View style={styles.cardContainer}>
          {ZONES.map((zone, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() =>
                navigation.navigate("OperatorPanel", {
                  operatorId,
                  operatorName,
                  localId,
                  zoneCode: zone.code,
                  zoneName: zone.name,
                })
              }
            >
              <Image source={zone.bg} style={styles.cardBg} />
              <View style={styles.cardOverlay} />
              <Text style={styles.cardText}>{zone.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: "OperatorLogin" }],
            })
          }
        >
          <Text style={styles.logoutText}>CERRAR SESIÓN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#003B64",
    justifyContent: "center",
    alignItems: "center",
  },

  inner: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  logo: {
    width: isWeb ? width * 0.30 : width * 0.50,
    height: isWeb ? width * 0.09 : width * 0.18,
    marginBottom: 60,
  },

  title: {
    color: "#FFFFFF",
    fontSize: isWeb ? 28 : 22,
    fontWeight: "900",
    marginBottom: 20,
  },

  cardContainer: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },

  card: {
    width: isWeb ? width * 0.20 : width * 0.40,
    height: isWeb ? width * 0.11 : width * 0.28,
    margin: 10,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#0002",
    elevation: 4,
  },

  cardBg: {
    width: "100%",
    height: "100%",
  },

  cardOverlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "35%",
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  cardText: {
    position: "absolute",
    bottom: 8,
    width: "100%",
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: isWeb ? 16 : 14,
    fontWeight: "bold",
  },

  logoutButton: {
    marginTop: 80,
    backgroundColor: "#E52449",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  logoutText: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
  },

  /* --- Overlay y card animada --- */
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 999,
  },

  welcomeCard: {
    width: "90%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 25,
    borderWidth: 3,
    borderColor: "#004E7C",
    alignItems: "center",
  },

  welcomeTitle: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    color: "#004E7C",
    marginBottom: 10,
  },

  welcomeSubtitle: {
    fontSize: 18,
    textAlign: "center",
    color: "#004E7C",
    marginBottom: 25,
  },

  welcomeButton: {
    backgroundColor: "#E52449",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  welcomeButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
  },

});










