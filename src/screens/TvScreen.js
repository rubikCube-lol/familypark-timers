import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import { supabase } from "../supabase/supabaseClient";

const { width } = Dimensions.get("window");

export default function TvScreen({ route }) {
  const [zoneCode, setZoneCode] = useState(null);
  const [localId, setLocalId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [ready, setReady] = useState(false);

  // ===============================
  // 1. OBTENER PARAMS (MOBILE + WEB)
  // ===============================
  useEffect(() => {
    let z = route?.params?.zoneCode ?? null;
    let l = route?.params?.localId ?? null;

    // WEB (hash routing)
    if (typeof window !== "undefined") {
      const hash = window.location.hash;

      // #/tv/TRAMP/1
      const pathMatch = hash.match(/#\/tv\/([^/]+)\/([^/]+)/);
      if (pathMatch) {
        z = pathMatch[1].toUpperCase();
        l = Number(pathMatch[2]);
      }
    }

    if (z && l) {
      setZoneCode(z);
      setLocalId(l);
    }

    setReady(true);
  }, []);

  // ===============================
  // 2. CARGAR SESIONES
  // ===============================
  const loadSessions = async () => {
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

    if (data) setSessions(data);
  };

  // ===============================
  // 3. REALTIME
  // ===============================
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [zoneCode, localId]);

  // ===============================
  // 4. LOADING / ERROR
  // ===============================
  if (!ready) return null;

  if (!zoneCode || !localId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>❌ Parámetros inválidos</Text>
        <Text style={styles.errorSubtitle}>
          Usa:
          {"\n"}#/tv/TRAMP/1
        </Text>
      </View>
    );
  }

  // ===============================
  // 5. RENDER
  // ===============================
  return (
    <View style={styles.container}>
      <Text style={styles.header}>FAMILY PARK – {zoneCode}</Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {sessions.map((s) => (
          <View
            key={s.id}
            style={[
              styles.card,
              s.status === "finished" && styles.cardFinished,
            ]}
          >
            <Text style={styles.name}>{s.kid_name}</Text>
            <Text style={styles.time}>{s.remaining_time}</Text>
            {s.status === "finished" && (
              <Text style={styles.finished}>TIEMPO FINALIZADO</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ===============================
// STYLES
// ===============================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#001f3f",
    padding: 20,
  },
  header: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  card: {
    width: width / 2 - 30,
    backgroundColor: "#fff0e6",
    borderRadius: 24,
    padding: 24,
    margin: 10,
    alignItems: "center",
  },
  cardFinished: {
    backgroundColor: "#ffe6e6",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  time: {
    fontSize: 36,
    fontWeight: "bold",
    marginVertical: 10,
  },
  finished: {
    color: "#c0392b",
    fontWeight: "bold",
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#001f3f",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
  },
  errorSubtitle: {
    color: "#ccc",
    fontSize: 18,
    textAlign: "center",
  },
});







