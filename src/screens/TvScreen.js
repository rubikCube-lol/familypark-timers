import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import { supabase } from "../supabase/supabaseClient";

const { width } = Dimensions.get("window");

export default function TvScreen({ route }) {
  // ===============================
  // 1. PARAMS DESDE MOBILE (si existieran)
  // ===============================
  let zoneCode = route?.params?.zoneCode ?? null;
  let localId = route?.params?.localId ?? null;

  // ===============================
  // 2. PARAMS DESDE WEB (HASH ROUTER)
  // ===============================
  if (typeof window !== "undefined" && (!zoneCode || !localId)) {
    const hash = window.location.hash;

    // Formato: #/tv/TRAMP/1
    const pathMatch = hash.match(/#\/tv\/([^/]+)\/([^/]+)/);
    if (pathMatch) {
      zoneCode = pathMatch[1].toUpperCase();
      localId = Number(pathMatch[2]);
    }

    // Formato: #/tv?zoneCode=TRAMP&localId=1
    if (!zoneCode || !localId) {
      const queryString = hash.split("?")[1];
      if (queryString) {
        const params = new URLSearchParams(queryString);
        zoneCode = params.get("zoneCode")?.toUpperCase();
        localId = Number(params.get("localId"));
      }
    }
  }

  // ===============================
  // 3. VALIDACIÓN
  // ===============================
  if (!zoneCode || !localId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>❌ Falta zoneCode o localId</Text>
        <Text style={styles.errorSubtitle}>
          Usa:
          {"\n"}#/tv/TRAMP/1
          {"\n"}o
          {"\n"}#/tv?zoneCode=TRAMP&localId=1
        </Text>
      </View>
    );
  }

  // ===============================
  // 4. STATE
  // ===============================
  const [sessions, setSessions] = useState([]);

  // ===============================
  // 5. LOAD SESSIONS
  // ===============================
  const loadSessions = async () => {
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("zone_code", zoneCode)
      .eq("local_id", localId)
      .or(
        `status.eq.active,and(status.eq.finished,end_time.gte.${thirtySecondsAgo})`
      )
      .order("start_time", { ascending: true });

    if (!error && data) {
      setSessions(data);
    }
  };

  // ===============================
  // 6. REALTIME
  // ===============================
  useEffect(() => {
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
        () => {
          loadSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [zoneCode, localId]);

  // ===============================
  // 7. RENDER
  // ===============================
  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        FAMILY PARK – {zoneCode}
      </Text>

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






