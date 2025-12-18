import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Image, ImageBackground } from "react-native";
import { supabase } from "../../supabase/supabaseClient";
import TvZoneColumn from "./TvZoneColumn";

const { width, height } = Dimensions.get("window");

export default function TvScreen() {
  const [localId, setLocalId] = useState(null);
  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(true);

  // ✅ Lee URL en ambos formatos:
  // - #/tv/1
  // - #/tv?localId=1
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash || "";

    // #/tv/1
    const matchPath = hash.match(/#\/tv\/([^/?]+)/);
    if (matchPath?.[1]) {
      const id = Number(matchPath[1]);
      if (!Number.isNaN(id)) setLocalId(id);
      return;
    }

    // #/tv?localId=1
    const matchQuery = hash.match(/#\/tv\?(.*)$/);
    if (matchQuery?.[1]) {
      const params = new URLSearchParams(matchQuery[1]);
      const idStr = params.get("localId") || params.get("local") || params.get("id");
      const id = Number(idStr);
      if (!Number.isNaN(id)) setLocalId(id);
      return;
    }
  }, []);

  // 📡 cargar zonas del local (tabla local_zones: local_id, zone_code)
  useEffect(() => {
    if (!localId) return;

    const loadZones = async () => {
      setLoadingZones(true);

      const { data, error } = await supabase
        .from("local_zones")
        .select("zone_code")
        .eq("local_id", localId);

      if (error) {
        console.error("Error cargando zonas:", error);
        setZones([]);
        setLoadingZones(false);
        return;
      }

      const z = (data || []).map((r) => r.zone_code).filter(Boolean);
      setZones(z);
      setLoadingZones(false);
    };

    loadZones();
  }, [localId]);

  if (!localId) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>URL inválida</Text>
        <Text style={styles.errorSub}>Usa: #/tv/1</Text>
        <Text style={styles.errorSub}>o: #/tv?localId=1</Text>
      </View>
    );
  }

  if (loadingZones) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>Cargando zonas...</Text>
      </View>
    );
  }

  if (!zones.length) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>Sin zonas para este local</Text>
        <Text style={styles.errorSub}>
          Revisa la tabla local_zones (local_id={localId})
        </Text>
      </View>
    );
  }

  const isTwoZones = zones.length === 2;

  return (
    <ImageBackground
      source={require("../../assets/zones/bg-autos.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        {/* Header global */}
        <View style={styles.topHeader}>
          <Image
            source={require("../../assets/logo-familypark.png")}
            style={styles.mainLogo}
            resizeMode="contain"
          />
          <Text style={styles.localText}>LOCAL #{localId}</Text>
        </View>

        {/* Grid de zonas */}
        <View style={[styles.zonesGrid, isTwoZones && styles.zonesGridTwo]}>
          {zones.map((zoneCode) => (
            <TvZoneColumn
              key={zoneCode}
              localId={localId}
              zoneCode={zoneCode}
              style={isTwoZones ? styles.zoneCellTwo : styles.zoneCellFour}
            />
          ))}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { width, height },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.20)",
    padding: 14,
  },

  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  mainLogo: { height: 70, width: 220 },
  localText: { color: "#fff", fontWeight: "900", fontSize: 18 },

  zonesGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  zonesGridTwo: {
    flexWrap: "nowrap",
  },

  // 4 zonas => 2x2
  zoneCellFour: {
    width: "49%",
    height: "49%",
  },

  // 2 zonas => 1x2
  zoneCellTwo: {
    width: "49%",
    height: "100%",
  },

  error: {
    flex: 1,
    backgroundColor: "#001f3f",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: { color: "white", fontSize: 28, fontWeight: "900", textAlign: "center" },
  errorSub: { color: "#ccc", fontSize: 16, marginTop: 10, textAlign: "center" },
});














