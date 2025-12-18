import React, { useEffect, useState, useRef } from "react";
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

  /* ⏱ reloj */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* 📌 leer URL: #/tv/TRAMP/1 */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const match = window.location.hash.match(/#\/tv\/([^/]+)\/([^/]+)/);
    if (match) {
      setZoneCode(match[1].toUpperCase());
      setLocalId(Number(match[2]));
    }
  }, []);

  /* 📡 cargar sesiones */
  const loadSessions = async () => {
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
  };

  /* 🔁 realtime */
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
          filter: `zone_code=eq.${zoneCode},local_id=eq.${localId}`,
        },
        loadSessions
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [zoneCode, localId]);

  /* helpers */
  const getRemainingSeconds = (s) => {
    if (s.status === "finished") return 0;
    const start = new Date(s.start_time).getTime();
    const total = s.duration_minutes * 60;
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
function TvCard({ session, remaining, formatTime }) {
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const totalSeconds = session.duration_minutes * 60;

  const isHalf = remaining <= totalSeconds / 2 && remaining > 30;
  const isBlink = remaining <= 30 && remaining > 0;
  const isFinished = session.status === "finished";

  useEffect(() => {
    let loop;
    if (isBlink) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.3,
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
    }
    return () => loop?.stop();
  }, [isBlink]);

  return (
    <Animated.View
      style={[
        styles.card,
        isHalf && styles.cardHalf,
        isFinished && styles.cardFinished,
        isBlink && { opacity: blinkAnim },
      ]}
    >
      <Text style={styles.name}>{session.kid_name}</Text>
      <Text style={styles.time}>
        {isFinished ? "00:00" : formatTime(remaining)}
      </Text>
      {isFinished && (
        <Text style={styles.finished}>TIEMPO FINALIZADO</Text>
      )}
    </Animated.View>
  );
}

/* 🎨 STYLES */
const styles = StyleSheet.create({
  bg: {
    width,
    height,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 20,
  },
  logo: {
    height: 90,
    marginBottom: 20,
    alignSelf: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
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
  cardHalf: {
    backgroundColor: "#ffeaa7",
  },
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










