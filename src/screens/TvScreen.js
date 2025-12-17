import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../supabase/supabaseClient";
import * as Linking from "expo-linking";

// Fondos según zone_code
const bgInflables = require("../../assets/zones/bg-inflables.png");
const bgTrampoline = require("../../assets/zones/bg-trampoline.png");
const bgSoftPlay = require("../../assets/zones/bg-softplay.png");
const bgAutos = require("../../assets/zones/bg-autos.png");
const bgKinder = require("../../assets/zones/bg-softplay.png");
const logo = require("../../assets/logo-familypark.png");

const zoneBackgrounds = {
  INFLA: bgInflables,
  TRAMP: bgTrampoline,
  SOFT: bgSoftPlay,
  AUTOS: bgAutos,
  KINDER: bgKinder,
};

const CARD_COLORS = {
  green: "#D5F5E3",
  yellow: "#FCF3CF",
  red: "#F5B7B1",
};

export default function TvScreen({ route }) {
  const { width } = useWindowDimensions();

  let zoneCode = route?.params?.zoneCode;
  let localId = route?.params?.localId;

  // -----------------------------
  // DETECTAR PARAMS DESDE WEB (Vercel / Hash / Query)
  // -----------------------------
  if (typeof window !== "undefined" && (!zoneCode || !localId)) {
    const { hash, pathname } = window.location;

    // 1️⃣ Formato: /pantalla/TRAMP/2
    const pathParts = pathname.split("/");
    if (pathParts[1] === "pantalla" && pathParts[2] && pathParts[3]) {
      zoneCode = pathParts[2].toUpperCase();
      localId = Number(pathParts[3]);
    }

    // 2️⃣ Formato hash: #/tv/TRAMP/2
    if (hash.startsWith("#/tv/")) {
      const parts = hash.replace("#/tv/", "").split("/");
      if (parts[0] && parts[1]) {
        zoneCode = parts[0].toUpperCase();
        localId = Number(parts[1]);
      }
    }

    // 3️⃣ Formato query: #/tv?zoneCode=TRAMP&localId=1
    if (hash.includes("?")) {
      const query = new URLSearchParams(hash.split("?")[1]);
      const z = query.get("zoneCode");
      const l = query.get("localId");

      if (z && l) {
        zoneCode = z.toUpperCase();
        localId = Number(l);
      }
    }
  }


  // Detectar desde deep link (Expo)
  const url = Linking.useURL();
  if (!zoneCode && url) {
    const parsed = Linking.parse(url);
    if (parsed?.path) {
      const parts = parsed.path.split("/");
      if (parts[0] === "pantalla" && parts[1] && parts[2]) {
        zoneCode = parts[1].toUpperCase();
        localId = Number(parts[2]);
      }
    }
  }

  if (!zoneCode || !localId) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorText}>❌ Falta zoneCode o localId</Text>
        <Text style={styles.errorSmall}>
          Formato válido: /pantalla/TRAMP/2
        </Text>
      </View>
    );
  }

  const bgImage = zoneBackgrounds[zoneCode] || bgSoftPlay;

  // -----------------------------
  // STATE
  // -----------------------------
  const [sessions, setSessions] = useState([]);
  const [finishedTimers, setFinishedTimers] = useState({});
  const [blink, setBlink] = useState(true);

  // -----------------------------
  // LOAD SESSIONS
  // -----------------------------
  const loadSessions = async () => {
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
  
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("zone_code", zoneCode)
      .eq("local_id", localId)
      .or(`status.eq.active,and(status.eq.finished,end_time.gte.${thirtySecondsAgo})`);
  
    if (!error) setSessions(data || []);
  };  

  // Cargar al inicio
  useEffect(() => {
    loadSessions();
  }, [zoneCode, localId]);

  // -----------------------------
  // REALTIME
  // -----------------------------
  useEffect(() => {
    const channel = supabase
      .channel("tv-sessions-global")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
        },
        (payload) => {
          console.log("📡 Realtime TV:", payload.eventType, payload.new?.id);
          // Siempre recargamos solo las sesiones de ESTA zona/local
          loadSessions();
        }
      )
      .subscribe((status) => {
        console.log("🟢 Estado del canal TV:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [zoneCode, localId]);

  // -----------------------------
  // TEMPORIZADOR GLOBAL
  // -----------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions((prev) => [...prev]); // Forzar re-render sin recargar DB
      setBlink((b) => !b);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // -----------------------------
  // FUNCIONES DE TIEMPO
  // -----------------------------
  const getRemaining = (s) => {
    const start = new Date(s.start_time).getTime();
    const total = s.duration_minutes * 60000;
    const diff = start + total - Date.now();

    if (diff <= 0)
      return { text: "00:00", finished: true, color: "red" };

    const sec = Math.floor(diff / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");

    const pct = diff / total;
    const color = pct <= 0.1 ? "red" : pct <= 0.5 ? "yellow" : "green";

    return { text: `${mm}:${ss}`, finished: false, color };
  };

  // -----------------------------
  // AUTO QUITAR FINALIZADOS
  // -----------------------------
  useEffect(() => {
    const cleaner = setInterval(() => {
      const now = Date.now();
      setSessions((prev) =>
        prev.filter((s) => {
          const start = finishedTimers[s.id];
          if (start && (now - start) / 1000 >= 30) return false;
          return true;
        })
      );
    }, 3000);

    return () => clearInterval(cleaner);
  }, [finishedTimers]);

  useEffect(() => {
    sessions.forEach((s) => {
      const { finished } = getRemaining(s);
      if (finished && !finishedTimers[s.id]) {
        setFinishedTimers((prev) => ({
          ...prev,
          [s.id]: Date.now(),
        }));
      }
    });
  }, [sessions]);
  
  // -----------------------------
  // RENDER
  // -----------------------------
  const sorted = [...sessions].sort((a, b) => {
    const A = getRemaining(a).text;
    const B = getRemaining(b).text;
    return A.localeCompare(B);
  });

  const isLarge = width >= 1400;
  const CARD_WIDTH = isLarge ? "28%" : "46%";

  return (
    <ImageBackground source={bgImage} style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.logoContainer}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        <ScrollView contentContainerStyle={styles.cardsContainer}>
          {sorted.map((s) => {
            const { text, finished, color } = getRemaining(s);

            const bgColor = finished
              ? blink
                ? "#F1948A"
                : "#FDEDEC"
              : CARD_COLORS[color];

            return (
              <View
                key={s.id}
                style={[
                  styles.card,
                  { width: CARD_WIDTH, backgroundColor: bgColor },
                ]}
              >
                <Text style={styles.name}>{s.kid_name}</Text>
                <Text style={styles.timer}>{text}</Text>
                {finished && (
                  <Text style={styles.finished}>TIEMPO FINALIZADO</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },

  errorScreen: {
    flex: 1,
    backgroundColor: "#001c34",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { color: "white", fontSize: 28, fontWeight: "900" },
  errorSmall: { color: "white", fontSize: 16, opacity: 0.7 },

  logoContainer: {
    alignItems: "center",
    marginTop: 22,
    marginBottom: 10,
  },
  logo: {
    width: 260,
    height: 90,
  },

  cardsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },

  card: {
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 12,
    margin: 10,
  },

  name: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 6,
  },
  timer: {
    fontSize: 40,
    fontWeight: "900",
    textAlign: "center",
  },

  finished: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "#7B241C",
  },
});





