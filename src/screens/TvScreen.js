import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { supabase } from "../../supabase/supabaseClient";

const { width } = Dimensions.get("window");

export default function TvScreen() {
  const [zoneCode, setZoneCode] = useState(null);
  const [localId, setLocalId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [now, setNow] = useState(Date.now());

  // ⏱ reloj interno
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // 📌 leer URL (SOLO hash routing)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash; // #/tv/TRAMP/1
    const match = hash.match(/#\/tv\/([^/]+)\/([^/]+)/);

    if (match) {
      setZoneCode(match[1].toUpperCase());
      setLocalId(Number(match[2]));
    }
  }, []);

  // 📡 cargar sesiones
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

  // 🔁 realtime
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

  // ⏳ helpers
  const getRemaining = (s) => {
    if (s.status === "finished") return "00:00";
    const start = new Date(s.start_time).getTime();
    const total = s.duration_minutes * 60;
    const elapsed = Math.floor((now - start) / 1000);
    const r = Math.max(0, total - elapsed);
    const mm = String(Math.floor(r / 60)).padStart(2, "0");
    const ss = String(r % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // ❌ error visible
  if (!zoneCode || !localId) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>URL inválida</Text>
        <Text style={styles.errorSub}>Usa: #/tv/TRAMP/1</Text>
      </View>
    );
  }

  // ✅ render
  return (
    <View style={styles.container}>
      <Text style={styles.header}>FAMILY PARK – {zoneCode}</Text>

      <View style={styles.grid}>
        {sessions.map((s) => (
          <View
            key={s.id}
            style={[
              styles.card,
              s.status === "finished" && styles.cardFinished,
            ]}
          >
            <Text style={styles.name}>{s.kid_name}</Text>
            <Text style={styles.time}>{getRemaining(s)}</Text>
            {s.status === "finished" && (
              <Text style={styles.finished}>TIEMPO FINALIZADO</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#001f3f",
    padding: 20,
  },
  header: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  card: {
    width: width / 2 - 40,
    backgroundColor: "#fff0e6",
    borderRadius: 26,
    padding: 24,
    margin: 12,
    alignItems: "center",
  },
  cardFinished: {
    backgroundColor: "#ffe6e6",
  },
  name: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  time: {
    fontSize: 40,
    fontWeight: "900",
    marginVertical: 10,
  },
  finished: {
    color: "#c0392b",
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








