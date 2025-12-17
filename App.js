import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";

import HomeScreen from "./src/screens/HomeScreen";
import OperatorLoginScreen from "./src/screens/OperatorLoginScreen";
import ZonesScreen from "./src/screens/ZonesScreen";
import OperatorPanelScreen from "./src/screens/OperatorPanelScreen";
import TvScreen from "./src/screens/TvScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const isWeb = typeof window !== "undefined";
  const hash = isWeb ? window.location.hash : "";

  // 👉 Detectamos si estamos en la TV
  const isTV = hash.startsWith("#/tv");

  // 👉 Leemos parámetros desde la URL
  const getTvParams = () => {
    if (!isWeb) return {};

    const query = hash.split("?")[1];
    if (!query) return {};

    const params = new URLSearchParams(query);
    return {
      zoneId: params.get("zoneId"),
      localId: params.get("localId"),
    };
  };

  const tvParams = getTvParams();

  // ===============================
  // 🔴 MODO TV (KIOSCO)
  // ===============================
  if (isTV) {
    return (
      <TvScreen
        route={{
          params: {
            zoneId: tvParams.zoneId,
            localId: Number(tvParams.localId),
          },
        }}
      />
    );
  }

  // ===============================
  // 🟢 APP NORMAL (OPERADORES / WEB)
  // ===============================
  const linking = {
    prefixes: [
      "http://localhost:8081",
      "https://familypark-timers.vercel.app",
      Linking.createURL("/"),
    ],
    config: {
      screens: {
        Home: "",
        OperatorLogin: "operador",
        Zones: "zonas",
        OperatorPanel: "panel",
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="OperatorLogin" component={OperatorLoginScreen} />
        <Stack.Screen name="Zones" component={ZonesScreen} />
        <Stack.Screen name="OperatorPanel" component={OperatorPanelScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
