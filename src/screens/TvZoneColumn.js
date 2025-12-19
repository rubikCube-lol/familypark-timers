import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
  ImageBackground,
  Image,
} from "react-native";
import { supabase } from "../../supabase/supabaseClient";

const ZONE_CONFIG = {
  TRAMP: {
    label: "TRAMPOLINE ZONE",
    background: require("../../assets/zones/bg-trampoline.png"),
  },
  INFL: {
    label: "JUEGOS INFLABLES",
    background: require("../../assets/zones/bg-inflables.png"),
  },
  SOFT: {
    label: "SOFT PLAY",
    background: require("../../assets/zones/bg-softplay.png"),
  },
  AUTOS: {
    label: "AUTOS CHOCADORES",
    background: require("../../assets/zones/bg-autos.png"),
  },
  KINDER: {
    label: "KINDER ZONE",
    background: require("../../assets/zones/bg-softplay.png"),
  },
};

export default function TvZoneColumn({ localId, zoneCode, style }) {
  const [sessions, setSessions] = useState([]);
  const [now, setNow] = useState(Date.now());

  // ⏱ reloj global (para countdown)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // 📡 cargar sesiones de esta zona
  const loadSessions = useCallback(async () => {
    if (!zoneCode || !localId) return;

    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("zone_code", zoneCode)
      .eq("local_id", localId)
      .or(`status.eq.active,and(status.eq.finished,end_time.gte.${thirtySecondsAgo})`)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("loadSessions error:", error);
      return;
    }

    setSessions(data || []);
  }, [zoneCode, localId]);

  // 🔁 realtime + fallback polling
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
          filter: `local_id=eq.${localId}`,
        },
        (payload) => {
          const row = payload.eventType === "DELETE" ? payload.old : payload.new;
          if (!row) return;

          if (row.zone_code === zoneCode && String(row.local_id) === String(localId)) {
            loadSessions();
          }
        }
      )
      .subscribe();

    const interval = setInterval(loadSessions, 2500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
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

  // ordenar por tiempo restante (menor arriba)
  const sortedSessions = [...sessions].sort(
    (a, b) => getRemainingSeconds(a) - getRemainingSeconds(b)
  );

  const bg = ZONE_CONFIG[zoneCode]?.background || ZONE_CONFIG.TRAMP.background;
  const label = ZONE_CONFIG[zoneCode]?.label || zoneCode;

  return (
    <ImageBackground source={bg} style={[styles.column, style]} resizeMode="cover">
      {/* Header por zona */}
      <View style={styles.header}>
        <Image
          source={require("../../assets/logo-familypark.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.zoneTitle}>{label}</Text>
      </View>

      {/* Cards */}
      <ScrollView contentContainerStyle={styles.grid}>
        {sortedSessions.map((s) => {
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
    </ImageBackground>
  );
}

function TvCard({ session, remaining, now, formatTime }) {
  const blinkAnim = useRef(new Animated.Value(1)).current;

  const totalSeconds = (session.duration_minutes || 0) * 60;
  const zeroReachedAtRef = useRef(null);

  // guardar “momento exacto” en que llegó a 0
  useEffect(() => {
    if (remaining === 0 && zeroReachedAtRef.current === null) {
      zeroReachedAtRef.current = Date.now();
    }
    if (remaining > 0 && zeroReachedAtRef.current !== null) {
      zeroReachedAtRef.current = null;
    }
  }, [remaining]);

  const finishedAt = session.end_time
    ? new Date(session.end_time).getTime()
    : zeroReachedAtRef.current;

  const finishedSeconds =
    finishedAt !== null ? Math.floor((now - finishedAt) / 1000) : null;

  const shouldBlink =
    remaining === 0 &&
    finishedSeconds !== null &&
    finishedSeconds >= 0 &&
    finishedSeconds <= 30;

  const shouldHide =
    remaining === 0 &&
    finishedSeconds !== null &&
    finishedSeconds > 30;

  useEffect(() => {
    let loop;
    if (shouldBlink) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, { toValue: 0.25, duration: 500, useNativeDriver: true }),
          Animated.timing(blinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      loop.start();
    } else {
      blinkAnim.setValue(1);
    }
    return () => loop?.stop();
  }, [shouldBlink, blinkAnim]);

  if (shouldHide) return null;

  const isHalf = totalSeconds > 0 && remaining > 0 && remaining <= totalSeconds / 2;

  return (
    <Animated.View
        style={[
        styles.card,
        remaining <= session.duration / 2 && styles.cardHalf,
        remaining === 0 && styles.cardFinished,
        { opacity: blinkAnim },
        ]}
    >
        <Text style={styles.name}>{session.child_name}</Text>

        {remaining > 0 ? (
        <Text style={styles.time}>{formatTime(remaining)}</Text>
        ) : (
        <Text style={styles.finished}>TIEMPO FINALIZADO</Text>
        )}
    </Animated.View>
    );


}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    padding: 10,
  },

  header: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  logo: {
    width: 110,
    height: 36,
    resizeMode: "contain",
    marginRight: 12,
  },
  
  zoneTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    paddingBottom: 14,
  },

  zoneWrapper: {
    flex: 1,
    width: "50%",
    height: "50%", // SOLO se usa cuando son 4 zonas
  },

  zoneBg: {
    flex: 1,
    padding: 16,
  },

  zoneHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  // Cards responsive dentro de la columna

  cardsContainer: {
    paddingBottom: 40,
  },

  card: {
    width: "48%",
    minWidth: 170,
    backgroundColor: "#fff0e6",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  cardHalf: { backgroundColor: "#ffeaa7" },
  cardFinished: { backgroundColor: "#ff7675" },

  name: { fontSize: 18, fontWeight: "900", textAlign: "center" },
  time: { fontSize: 30, fontWeight: "900", marginVertical: 6 },
  finished: { color: "#fff", fontWeight: "900", fontSize: 12 },
});

