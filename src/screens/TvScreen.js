import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  ImageBackground,
  Animated,
  ScrollView,
} from "react-native";
import { supabase } from "../../supabase/supabaseClient";

const { width, height } = Dimensions.get("window");

export default function TvScreen() {
  const [zoneCode, setZoneCode] = useState(null);
  const [localId, setLocalId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [now, setNow] = useState(Date.now());

  // ⏱ reloj global (para countdown, blink y auto-hide)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // 📌 leer URL: #/tv/TRAMP/1
  useEffect(() => {
    if (typeof window === "undefined") return;
    const match = window.location.hash.match(/#\/tv\/([^/]+)\/([^/]+)/);
    if (match) {
      setZoneCode(match[1].toUpperCase());
      setLocalId(Number(match[2]));
    }
  }, []);

  // 📡 cargar sesiones (activos + terminados últimos 30s)
  const loadSessions = useCallback(async () => {
    if (!zoneCode || !localId) return;

    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("zone_code", zoneCode)
      .eq("local_id", localId)
      // activos OR (finalizados en los últimos 30s)
      .or(`status.eq.active,and(status.eq.finished,end_time.gte.${thirtySecondsAgo})`)
      .order("start_time", { ascending: true });

    if (error) {
      console.log("TV loadSessions error:", error);
      return;
    }

    setSessions(data || []);
  }, [zoneCode, localId]);

  // 🔁 realtime (FIX: filtro correcto con AND, NO con coma)
  useEffect(() => {
    if (!zoneCode || !localId) return;

    loadSessions();

    const channel = supabase
      .channel(`tv-${localId}-${zoneCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          // ✅ así funciona: con AND
          filter: `zone_code=eq.${zoneCode} AND local_id=eq.${localId}`,
        },
        () => {
          loadSessions();
        }
      )
      .subscribe((status) => {
        console.log("🟢 TV channel:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [zoneCode, localId, loadSessions]);

  // helpers
  const getRemainingSeconds = (s) => {
    const start = new Date(s.start_time).getTime();
    const total = (s.duration_minutes || 0) * 60;
    const elapsed = Math.floor((now - start) / 1000);
    return Math.max(0, total - elapsed);
  };

  const formatTime = (sec) => {
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  if (!zoneCode || !localId) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>URL inválida</Text>
        <Text style={styles.errorSub}>Usa: #/tv/TRAMP/1</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      // deja tu fondo como lo tienes (si quieres cambiar por zona, lo vemos después)
      source={require("../../assets/zones/bg-autos.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Image
          source={require("../../assets/logo-familypark.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <ScrollView contentContainerStyle={styles.grid}>
          {sessions.map((s) => {
            const remaining = getRemainingSeconds(s);
            return (
              <TvCard
                key={s.id}
                session={s}
                remaining={remaining}
                now={now}
                formatTime={formatTime}
              />
            );
          })}
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

/* 🧠 CARD */
function TvCard({ session, remaining, now, formatTime }) {
  const blinkAnim = useRef(new Animated.Value(1)).current;

  // Guardamos el instante en que “llegó a 0” (aunque BD aún no marque finished)
  const zeroReachedAtRef = useRef(null);

  // Total segundos (para “mitad = amarillo”)
  const totalSeconds = (session.duration_minutes || 0) * 60;

  // Cuando toca 0 por primera vez, fijamos el tiempo
  useEffect(() => {
    if (remaining === 0 && zeroReachedAtRef.current === null) {
      zeroReachedAtRef.current = Date.now();
    }
    // Si vuelve a tener tiempo (caso raro), reseteamos
    if (remaining > 0 && zeroReachedAtRef.current !== null) {
      zeroReachedAtRef.current = null;
    }
  }, [remaining]);

  // Si la BD trae end_time, lo priorizamos como inicio “finalizado”
  const finishedAt =
    session.end_time ? new Date(session.end_time).getTime() : zeroReachedAtRef.current;

  const finishedSeconds =
    finishedAt ? Math.floor((now - finishedAt) / 1000) : null;

  // ✅ Parpadea solo DESPUÉS de llegar a 0, por 30s
  const shouldBlink =
    remaining === 0 && finishedSeconds !== null && finishedSeconds >= 0 && finishedSeconds <= 30;

  // ✅ Auto-desaparece después de 30s desde que llegó a 0
  const shouldHide = remaining === 0 && finishedSeconds !== null && finishedSeconds > 30;

  useEffect(() => {
    let loop;
    if (shouldBlink) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.25,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      blinkAnim.setValue(1);
    }
    return () => loop?.stop();
  }, [shouldBlink, blinkAnim]);

  if (shouldHide) return null;

  const isHalfOrLess =
    totalSeconds > 0 && remaining > 0 && remaining <= totalSeconds / 2;

  const isFinished = remaining === 0;

  return (
    <Animated.View
      style={[
        styles.card,
        isHalfOrLess && styles.cardHalf,      // 🟡 mitad del tiempo
        isFinished && styles.cardFinished,    // 🔴 finalizado
        shouldBlink && { opacity: blinkAnim },
      ]}
    >
      <Text style={styles.name}>{session.kid_name}</Text>

      <Text style={styles.time}>
        {isFinished ? "00:00" : formatTime(remaining)}
      </Text>

      {isFinished && <Text style={styles.finished}>TIEMPO FINALIZADO</Text>}
    </Animated.View>
  );
}

/* 🎨 STYLES */
const styles = StyleSheet.create({
  bg: { width, height },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 20,
  },
  logo: {
    height: 90,
    marginBottom: 18,
    alignSelf: "center",
  },

  // ✅ grid responsivo (se ordenan solas y bajan a nuevas filas)
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingBottom: 40,
  },

  card: {
    width: width / 3 - 30,
    minWidth: 260,
    backgroundColor: "#fff0e6",
    borderRadius: 30,
    padding: 28,
    margin: 12,
    alignItems: "center",
  },

  // 🟡 mitad del tiempo
  cardHalf: {
    backgroundColor: "#ffeaa7",
  },

  // 🔴 finalizado
  cardFinished: {
    backgroundColor: "#ff7675",
  },

  name: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  time: {
    fontSize: 42,
    fontWeight: "900",
    marginVertical: 10,
  },
  finished: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
  },

  error: {
    flex: 1,
    backgroundColor: "#001f3f",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "white",
    fontSize: 30,
    fontWeight: "900",
  },
  errorSub: {
    color: "#ccc",
    fontSize: 18,
    marginTop: 10,
  },
});












