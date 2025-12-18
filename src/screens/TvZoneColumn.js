import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
  ImageBackground,
} from "react-native";
import { supabase } from "../../supabase/supabaseClient";

const { width } = Dimensions.get("window");

const ZONE_CONFIG = {
  TRAMP: {
    label: 'TRAMPOLINE ZONE',
    background: require('../../assets/bg-trampoline.png'),
  },
  INFL: {
    label: 'JUEGOS INFLABLES',
    background: require('../../assets/bg-inflables.png'),
  },
  SOFT: {
    label: 'SOFT PLAY',
    background: require('../../assets/bg-softplay.png'),
  },
  AUTOS: {
    label: 'AUTOS CHOCADORES',
    background: require('../../assets/bg-autos.png'),
  },
};


export default function TvZoneColumn({ localId, zoneCode }) {
  const [sessions, setSessions] = useState([]);
  const [now, setNow] = useState(Date.now());

  /* ⏱ reloj global */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* 📡 cargar sesiones */
  const loadSessions = useCallback(async () => {
    if (!zoneCode || !localId) return;

    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("zone_code", zoneCode)
      .eq("local_id", localId)
      .or(
        `status.eq.active,and(status.eq.finished,end_time.gte.${thirtySecondsAgo})`
      )
      .order("start_time", { ascending: true });

    setSessions(data || []);
  }, [zoneCode, localId]);

  /* 🔁 realtime + fallback polling */
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
        },
        (payload) => {
          const row =
            payload.eventType === "DELETE"
              ? payload.old
              : payload.new;

          if (
            row.zone_code === zoneCode &&
            String(row.local_id) === String(localId)
          ) {
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

  /* helpers */
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

  /* ordenar por tiempo restante */
  const sortedSessions = [...sessions].sort(
    (a, b) => getRemainingSeconds(a) - getRemainingSeconds(b)
  );

  return (
    <ImageBackground
        source={ZONE_CONFIG[zoneCode]?.background}
        style={styles.column}
        resizeMode="cover"
    >
        {/* HEADER */}
        <View style={styles.header}>
        <Image
            source={require('../../assets/familypark-logo.png')}
            style={styles.logo}
            resizeMode="contain"
        />
        <Text style={styles.zoneTitle}>
            {ZONE_CONFIG[zoneCode]?.label}
        </Text>
        </View>

        {/* CARDS */}
        <ScrollView contentContainerStyle={styles.grid}>
        {sortedSessions.map((s) => {
            const remaining = getRemainingSeconds(s);
            return (
            <TVCard
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

/* 🧠 CARD */
function TvCard({ session, remaining, now, formatTime }) {
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const totalSeconds = (session.duration_minutes || 0) * 60;

  const zeroReachedAtRef = useRef(null);

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
  }, [shouldBlink]);

  if (shouldHide) return null;

  const isHalf =
    totalSeconds > 0 && remaining > 0 && remaining <= totalSeconds / 2;

  return (
    <Animated.View
      style={[
        styles.card,
        isHalf && styles.cardHalf,
        remaining === 0 && styles.cardFinished,
        shouldBlink && { opacity: blinkAnim },
      ]}
    >
      <Text style={styles.name}>{session.kid_name}</Text>
      <Text style={styles.time}>
        {remaining === 0 ? "00:00" : formatTime(remaining)}
      </Text>
      {remaining === 0 && (
        <Text style={styles.finished}>TIEMPO FINALIZADO</Text>
      )}
    </Animated.View>
  );
}

/* 🎨 STYLES */
const styles = StyleSheet.create({
  column: {
    flex: 1,
    padding: 10,
  },
  zoneTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  card: {
    width: width / 4 - 30,
    minWidth: 220,
    backgroundColor: "#fff0e6",
    borderRadius: 24,
    padding: 18,
    margin: 8,
    alignItems: "center",
  },
  cardHalf: {
    backgroundColor: "#ffeaa7",
  },
  cardFinished: {
    backgroundColor: "#ff7675",
  },
  name: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  time: {
    fontSize: 32,
    fontWeight: "900",
    marginVertical: 6,
  },
  finished: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
});
