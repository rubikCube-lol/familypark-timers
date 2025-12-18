import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  ImageBackground,
} from "react-native";
import { supabase } from "../../supabase/supabaseClient";
import { TvZoneColumn } from "../..screens/TvZoneColumn";

const { width, height } = Dimensions.get("window");

export default function TvScreen() {
  const [localId, setLocalId] = useState(null);
  const [zones, setZones] = useState([]);

  // 📌 leer URL: #/tv/1
  useEffect(() => {
    if (typeof window === "undefined") return;

    const match = window.location.hash.match(/#\/tv\/([^/]+)/);
    if (match) {
      setLocalId(Number(match[1]));
    }
  }, []);

  // 📡 cargar zonas del local
  useEffect(() => {
    if (!localId) return;

    const loadZones = async () => {
      const { data, error } = await supabase
        .from("local_zones")
        .select("zone_code")
        .eq("local_id", localId);

      if (error) {
        console.error("Error cargando zonas:", error);
        return;
      }

      setZones(data.map((z) => z.zone_code));
    };

    loadZones();
  }, [localId]);

  if (!localId) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>URL inválida</Text>
        <Text style={styles.errorSub}>Usa: #/tv/1</Text>
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

        <View
          style={[
            styles.zonesGrid,
            zones.length === 2 && styles.twoZones,
          ]}
        >
          {zones.map((zone) => (
            <TvZoneColumn
              key={zone}
              localId={localId}
              zoneCode={zone}
            />
          ))}
        </View>
      </View>
    </ImageBackground>
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
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 20,
  },
  logo: {
    height: 90,
    marginBottom: 18,
    alignSelf: "center",
  },

  zonesGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },

  // cuando son solo 2 zonas
  twoZones: {
    flexDirection: "row",
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













