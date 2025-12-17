import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ImageBackground,
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator } from "react-native";
import { supabase } from "../../supabase/supabaseClient";

// Componentes reutilizables
import FullScreenOverlay from "../../components/FullScreenOverlay";
import BottomSheet from "../../components/BottomSheet";

// Utilidades
import { normalizePhone } from "../../utils/normalizePhone";
import {
  sendStartTurn,
  sendWarning,
  sendEndTurn,
} from "../../utils/sendWhatsAppCloud";
import {
  animateIn,
  animateOut,
  slideIn,
  slideOut,
} from "../../utils/animations";

// Fondos por zonas
const bgInflables = require("../../assets/zones/bg-inflables.png");
const bgTrampoline = require("../../assets/zones/bg-trampoline.png");
const bgSoftPlay = require("../../assets/zones/bg-softplay.png");
const bgAutos = require("../../assets/zones/bg-autos.png");

const zoneBackgrounds = {
  INFLA: bgInflables,
  TRAMP: bgTrampoline,
  SOFT: bgSoftPlay,
  AUTOS: bgAutos,
  KINDER: bgSoftPlay,
};

const SCREEN_HEIGHT = Dimensions.get("window").height;

// ========================= ESTILOS BASE =========================
const baseOverlay = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.55)",
  justifyContent: "center",
  alignItems: "center",
};

const baseCard = {
  width: "90%",
  maxWidth: 380,
  backgroundColor: "#FFFFFF",
  borderRadius: 20,
  padding: 25,
  borderWidth: 3,
  borderColor: "#004E7C",
  alignItems: "center",
};

const baseButton = {
  paddingVertical: 14,
  borderRadius: 15,
  borderWidth: 3,
  alignItems: "center",
  justifyContent: "center",
};

const btnDanger = {
  backgroundColor: "#E52449",
  borderColor: "#FFFFFF",
};

const baseTitle = {
  fontSize: 22,
  fontWeight: "900",
  textAlign: "center",
  color: "#004E7C",
};

const baseSubtitle = {
  fontSize: 18,
  textAlign: "center",
  color: "#004E7C",
};

// ====================== COMPONENTE PRINCIPAL ======================

export default function OperatorPanelScreen({ route, navigation }) {
  const { operatorId, operatorName, localId, zoneCode, zoneName } = route.params;
  const bgImage = zoneBackgrounds[zoneCode] || bgSoftPlay;

  // Modal bienvenida
  const [showWelcome, setShowWelcome] = useState(
    route.params?.welcomeShownPanel ? false : true
  );
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.85))[0];

  // Modal reporte generado
  const [showReportCard, setShowReportCard] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const reportFade = useState(new Animated.Value(0))[0];
  const reportScale = useState(new Animated.Value(0.85))[0];

  // Mensaje "nuevo turno"
  const [newTurnNotice, setNewTurnNotice] = useState(false);
  const noticeFade = useState(new Animated.Value(0))[0];
  const noticeTranslate = useState(new Animated.Value(-10))[0];

  // Estados formulario
  const [kidName, setKidName] = useState("");
  const [kidId, setKidId] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [duration, setDuration] = useState(20);
  const [loading, setLoading] = useState(false);

  // Sesiones
  const [sessions, setSessions] = useState([]);
  const [finishedSessions, setFinishedSessions] = useState([]);
  const [warned3Min, setWarned3Min] = useState({});
  const [notifiedGameOver, setNotifiedGameOver] = useState({});

  // BottomSheet turnos activos
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // BottomSheet turnos finalizados
  const [finishedVisible, setFinishedVisible] = useState(false);
  const finishedSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Reloj interno
  const [now, setNow] = useState(Date.now());

  // ======================= EFECTOS =======================

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("sessions-realtime")
  
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sessions",
        },
        (payload) => {
          loadSessions();
        }
      )
  
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
        },
        (payload) => {
          loadSessions();
        }
      )
  
      .subscribe((status) => {
        console.log("🟢 Realtime status:", status);
      });
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  

  // Animación bienvenida
  useEffect(() => {
    if (showWelcome) animateIn(fadeAnim, scaleAnim);
  }, [showWelcome, fadeAnim, scaleAnim]);

  // Animación reporte
  useEffect(() => {
    if (showReportCard) animateIn(reportFade, reportScale);
  }, [showReportCard, reportFade, reportScale]);

  // Chequear tiempos de advertencia / término
  useEffect(() => {
    if (!sessions || sessions.length === 0) return;

    const checkTimes = async () => {
      for (const s of sessions) {
        const remaining = getRemaining(s);
        const cleanedPhone = normalizePhone(s.parent_phone);

        const warnedDB = s.warned_3min === true;
        if (
          remaining <= 180 &&
          remaining > 0 &&
          !warnedDB &&
          !warned3Min[s.id]
        ) {
          await sendWarning(
            cleanedPhone,
            s.kid_name,
            zoneName
          );
          
          setWarned3Min((prev) => ({ ...prev, [s.id]: true }));

          await supabase
            .from("sessions")
            .update({ warned_3min: true })
            .eq("id", s.id);

          loadSessions();
        }

        const endedDB = s.sent_game_over === true;
        if (
          remaining <= 0 &&
          s.status === "active" &&
          !endedDB &&
          !notifiedGameOver[s.id]
        ) {
          await sendEndTurn(
            cleanedPhone,
            s.kid_name,
            zoneName
          );
          
          setNotifiedGameOver((prev) => ({ ...prev, [s.id]: true }));

          await supabase
            .from("sessions")
            .update({
              status: "finished",
              end_time: new Date().toISOString(),
              sent_game_over: true,
            })
            .eq("id", s.id);

          loadSessions();
        }
      }
    };

    checkTimes();
  }, [now, sessions, warned3Min, notifiedGameOver, operatorName, zoneName]);

  // ======================= HELPERS =======================

  const loadSessions = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("zone_code", zoneCode)
      .eq("local_id", localId)
      .eq("status", "active")
      .order("start_time", { ascending: true });

    setSessions(data || []);
  };

  const loadFinished = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("zone_code", zoneCode)
      .eq("local_id", localId)
      .eq("status", "finished")
      .order("end_time", { ascending: false });

    setFinishedSessions(data || []);
  };

  const showMessage = (title, msg) => {
    if (Platform.OS === "web") console.log(`${title}: ${msg}`);
    else alert(`${title}\n\n${msg}`);
  };

  const getRemaining = (session) => {
    const start = new Date(session.start_time).getTime();
    const total = session.duration_minutes * 60;
    const elapsed = Math.floor((now - start) / 1000);
    return Math.max(0, total - elapsed);
  };

  const formatTime = (sec) => {
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const getPlayedTime = (s) => {
    if (!s.start_time || !s.end_time) return "--:--";

    const start = new Date(s.start_time).getTime();
    const end = new Date(s.end_time).getTime();
    const sec = Math.floor((end - start) / 1000);
    const min = String(Math.floor(sec / 60)).padStart(2, "0");
    const rem = String(sec % 60).padStart(2, "0");

    return `${min}:${rem}`;
  };

  const cerrarWelcome = () => {
    animateOut(fadeAnim, scaleAnim, 250, () => {
      setShowWelcome(false);
      navigation.setParams({ welcomeShownPanel: true });
    });
  };

  const openModal = () => {
    setModalVisible(true);
    slideIn(slideAnim, SCREEN_HEIGHT);
  };

  const closeModal = () => {
    slideOut(slideAnim, SCREEN_HEIGHT, () => setModalVisible(false));
  };

  const openFinished = () => {
    loadFinished();
    setFinishedVisible(true);
    slideIn(finishedSlideAnim, SCREEN_HEIGHT);
  };

  const closeFinished = () => {
    slideOut(finishedSlideAnim, SCREEN_HEIGHT, () =>
      setFinishedVisible(false)
    );
  };

  const showNewTurnMessage = () => {
    setNewTurnNotice(true);

    Animated.parallel([
      Animated.timing(noticeFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(noticeTranslate, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(noticeFade, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(noticeTranslate, {
            toValue: -10,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => setNewTurnNotice(false));
      }, 2500);
    });
  };

  // ======================= HANDLERS =======================

  const handleStartTurn = async () => {
    if (!kidName || !kidId || !parentPhone) {
      showMessage("Datos faltantes", "Completa todos los campos");
      return;
    }

    const cleanedPhone = normalizePhone(parentPhone);
    if (!cleanedPhone) {
      showMessage("Teléfono inválido", "Debes ingresar un número válido.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("sessions").insert({
      kid_name: kidName.trim(),
      kid_identifier: kidId.trim(),
      parent_phone: cleanedPhone,
      zone_code: zoneCode,
      operator_id: operatorId,
      local_id: localId,
      duration_minutes: duration,
      start_time: new Date().toISOString(),
      status: "active",
    });

    setLoading(false);

    if (error) {
      showMessage("Error", "No se pudo iniciar turno");
      return;
    }

    // 🔥 1. Reset inmediato del formulario (UX rápida)
    setKidName("");
    setKidId("");
    setParentPhone("");
    setDuration(20);

    // 🔥 2. Cerrar teclado en mobile
    Keyboard.dismiss();

    // 🔥 3. Luego envías WhatsApp (no bloquea la UI)
    await sendStartTurn(
      cleanedPhone,
      kidName,
      zoneName,
      duration
    );
    

    // 🔥 4. Realtime hará el resto
    showNewTurnMessage();
  };

  const handleFinish = async (id) => {
    const { data: sessionData } = await supabase
      .from("sessions")
      .select("kid_name, parent_phone")
      .eq("id", id)
      .single();

    const cleanedPhone = normalizePhone(sessionData.parent_phone);

    await supabase
      .from("sessions")
      .update({
        status: "finished",
        end_time: new Date().toISOString(),
      })
      .eq("id", id);

    await sendEndTurn(
      cleanedPhone,
      sessionData.kid_name,
      sessionData.kid_name,
      zoneName
    );

    loadSessions();
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);

    if (Platform.OS !== "web") {
      alert("La descarga del reporte está disponible solo en computadores.");
      setReportLoading(false);
      return;
    }

    const XLSX = await import("xlsx");
    const { saveAs } = await import("file-saver");

    const formatted = finishedSessions.map((s) => ({
      Nombre: s.kid_name,
      "ID Niño": s.kid_identifier,
      Asignado: `${s.duration_minutes} min`,
      "Tiempo jugado": getPlayedTime(s),
      Inicio: new Date(s.start_time).toLocaleTimeString(),
      Término: new Date(s.end_time).toLocaleTimeString(),
      Zona: zoneName,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formatted);
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");

    const fileName = `Reporte_${zoneName
      .replace(/\s+/g, "")}_${new Date()
      .toLocaleDateString()
      .replace(/\//g, "-")}.xlsx`;

    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(
      new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      fileName
    );

    const { error: deleteError } = await supabase
      .from("sessions")
      .delete()
      .eq("status", "finished")
      .eq("local_id", localId)
      .eq("zone_code", zoneCode);

    if (deleteError) {
      alert("Hubo un error al intentar limpiar las sesiones.");
      setReportLoading(false);
      return;
    }

    setShowReportCard(true);
    loadFinished();
    setReportLoading(false);
  };

  // ======================= RENDER LISTAS =======================

  const renderItem = ({ item }) => {
    const remaining = getRemaining(item);

    return (
      <View style={styles.sessionCard}>
        <View style={styles.rowTop}>
          <Text style={styles.sessionName}>{item.kid_name}</Text>

          <View style={styles.timerBox}>
            <Text style={styles.timerIcon}>⏳</Text>
            <Text style={styles.sessionTime}>{formatTime(remaining)}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.sessionLabel}>ID:</Text>
            <Text style={styles.sessionText}>{item.kid_identifier}</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.sessionLabel}>TEL:</Text>
            <Text style={styles.sessionText}>{item.parent_phone}</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.sessionLabel}>ZONA:</Text>
            <Text style={styles.sessionText}>{zoneName}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.finishButton}
          onPress={() => handleFinish(item.id)}
        >
          <Text style={styles.finishButtonText}>Finalizar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ======================= JSX PRINCIPAL =======================

  return (
    <ImageBackground source={bgImage} style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* MODAL REPORTE */}
        <FullScreenOverlay
          visible={showReportCard}
          onClose={() => setShowReportCard(false)}
        >
          <Animated.View
            style={[
              styles.reportCard,
              { opacity: reportFade, transform: [{ scale: reportScale }] },
            ]}
          >
            <Text style={[styles.reportTitle, styles.modalTitle]}>¡Reporte generado!</Text>
            <Text style={[styles.reportSubtitle, styles.modalText]}>
              Reporte generado y sesiones finalizadas eliminadas correctamente.
              ¡Hiciste un buen trabajo!
            </Text>

            <TouchableOpacity
              style={[styles.reportButtonModal, styles.modalButton]}
              onPress={() => {
                animateOut(reportFade, reportScale, 250, () =>
                  setShowReportCard(false)
                );
              }}
            >
              <Text style={styles.reportButtonTextModal}>CERRAR</Text>
            </TouchableOpacity>
          </Animated.View>
        </FullScreenOverlay>

        {/* MODAL BIENVENIDA */}
        <FullScreenOverlay visible={showWelcome} onClose={() => {}}>
          <Animated.View
            style={[
              styles.welcomeCard,
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <Text style={[styles.welcomeTitle, styles.modalTitle]}>¡Bienvenido operador!</Text>
            <Text style={[styles.welcomeSubtitle, styles.modalText]}>
              Ya es hora de ingresar nuevos jugadores ¡Que te diviertas!
            </Text>

            <TouchableOpacity
              style={[styles.welcomeButton, styles.modalButton]}
              onPress={cerrarWelcome}
            >
              <Text style={styles.welcomeButtonText}>CERRAR</Text>
            </TouchableOpacity>
          </Animated.View>
        </FullScreenOverlay>

        {/* CONTENIDO PRINCIPAL */}
        <View style={styles.container}>
          <Text style={styles.title}>PANEL OPERADOR</Text>
          <Text style={styles.subtitle}>{zoneName}</Text>

          <View style={styles.contentCenter}>
            <View style={styles.topRow}>
              {/* FORMULARIO */}
              <View style={styles.formCard}>
                <Text style={styles.label}>NOMBRE Y APELLIDO:</Text>
                <TextInput
                  style={styles.input}
                  value={kidName}
                  onChangeText={setKidName}
                />

                <View style={styles.separator} />

                <Text style={styles.label}>ID:</Text>
                <TextInput
                  style={styles.input}
                  value={kidId}
                  onChangeText={setKidId}
                />

                <View style={styles.separator} />

                <Text style={styles.label}>TELÉFONO APODERADO:</Text>
                <TextInput
                  style={styles.input}
                  value={parentPhone}
                  onChangeText={setParentPhone}
                  keyboardType="phone-pad"
                />

                <View style={styles.separator} />

                <Text style={styles.label}>TIEMPO:</Text>

                <View style={styles.timeRow}>
                  {[10, 20, 30].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.timeButton,
                        duration === t && styles.timeButtonActive,
                      ]}
                      onPress={() => setDuration(t)}
                    >
                      <Text
                        style={[
                          styles.timeButtonText,
                          duration === t && styles.timeButtonTextActive,
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* BOTONES LATERALES */}
              <View style={styles.sideButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  disabled={loading}
                  onPress={handleStartTurn}
                >
                  <Text style={styles.actionText}>
                    {loading ? "CREANDO TURNO..." : "INICIAR TURNO"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionButton, styles.activeButtonFix]} onPress={openModal}>
                  <Text style={styles.actionText}>TURNOS ACTIVOS</Text>
                </TouchableOpacity>

                {/* MINI MENSAJE DE TURNO AGREGADO */}
                <View style={styles.noticeWrapper}>
                  {newTurnNotice && (
                    <Animated.View
                      style={[
                        styles.newTurnNotice,
                        {
                          opacity: noticeFade,
                          transform: [{ translateY: noticeTranslate }],
                        },
                      ]}
                    >
                      <Text style={styles.newTurnNoticeText}>
                        Se ha agregado un nuevo turno activo
                      </Text>
                    </Animated.View>
                  )}
                </View>


                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={openFinished}
                >
                  <Text style={styles.actionText}>TURNOS FINALIZADOS</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* SHEET TURNOS ACTIVOS */}
        <BottomSheet
          visible={modalVisible}
          slideAnim={slideAnim}
          onClose={closeModal}
        >
          <Text style={styles.sheetTitle}>TURNOS ACTIVOS</Text>

          <FlatList
            data={sessions}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No hay turnos activos actualmente
              </Text>
            }
            showsVerticalScrollIndicator={false}
          />

          <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
            <Text style={styles.closeButtonText}>CERRAR</Text>
          </TouchableOpacity>
        </BottomSheet>

        {/* SHEET TURNOS FINALIZADOS */}
        <BottomSheet
          visible={finishedVisible}
          slideAnim={finishedSlideAnim}
          onClose={closeFinished}
        >
          <Text style={styles.sheetTitle}>TURNOS FINALIZADOS</Text>

          <FlatList
            data={finishedSessions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.sessionCard}>
                <Text style={styles.sessionName}>{item.kid_name}</Text>
                <Text style={styles.sessionText}>
                  ID: {item.kid_identifier}
                </Text>
                <Text style={styles.sessionText}>
                  TEL: {item.parent_phone}
                </Text>
                <Text style={styles.sessionText}>
                  INICIO: {new Date(item.start_time).toLocaleString()}
                </Text>
                <Text style={styles.sessionText}>
                  FIN: {new Date(item.end_time).toLocaleString()}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No hay turnos finalizados actualmente
              </Text>
            }
            showsVerticalScrollIndicator={false}
          />

          <TouchableOpacity
            style={styles.reportButton}
            onPress={handleGenerateReport}
            disabled={reportLoading}
          >
            {reportLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.reportButtonText}>GENERAR REPORTE</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeFinished}
          >
            <Text style={styles.closeButtonText}>CERRAR</Text>
          </TouchableOpacity>
        </BottomSheet>
      </SafeAreaView>
    </ImageBackground>
  );
}

// ======================= ESTILOS =======================

const styles = StyleSheet.create({
  bg: { flex: 1, resizeMode: "cover" },

  container: {
    flex: 1,
    padding: 16,
  },

  contentCenter: {
    flex: 1,
    justifyContent: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    color: "#ffffff",
    marginTop: 20,
  },

  subtitle: {
    fontSize: 22,
    textAlign: "center",
    fontWeight: "700",
    color: "#fff",
    marginBottom: 10,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 50,
  },

  // FORM
  formCard: {
    flex: 2,
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: 15,
    borderRadius: 16,
    marginRight: 10,
  },

  label: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 4,
    color: "#00476F",
  },

  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  separator: { height: 14 },

  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },

  timeButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 3,
    borderRadius: 12,
    backgroundColor: "#ddd",
  },

  timeButtonActive: {
    backgroundColor: "#00476F",
  },

  timeButtonText: {
    textAlign: "center",
    fontSize: 16,
    color: "#333",
    fontWeight: "700",
  },

  timeButtonTextActive: {
    color: "#fff",
  },

  // BOTONES LATERALES
  sideButtons: {
    flex: 1,
    justifyContent: "space-between",
  },

  actionButton: {
    backgroundColor: "#003B60",
    padding: 15,
    borderRadius: 12,
  },

  actionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  activeButtonFix: {
    marginTop: 50,  // Ajusta 15–30 según qué tan abajo lo quieras
  },


  // LISTAS
  emptyText: {
    textAlign: "center",
    color: "#00476F",
    marginTop: 40,
    fontSize: 18,
    fontWeight: "600",
  },

  sessionCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#003B60",
  },

  sessionName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#00476F",
    marginBottom: 4,
  },

  sessionText: {
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
  },

  sessionTime: {
    fontSize: 20,
    fontWeight: "900",
    color: "#00476F",
  },

  finishButton: {
    marginTop: 12,
    backgroundColor: "#E52449",
    paddingVertical: 10,
    borderRadius: 10,
  },

  finishButtonText: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  // A2 — Optimización visual tarjetas
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  timerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },

  timerIcon: {
    fontSize: 18,
    marginRight: 4,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 5,
  },

  infoBlock: {
    flex: 1,
  },

  sessionLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#00476F",
  },

  // títulos sheet
  sheetTitle: {
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
    color: "#003B60",
    marginBottom: 14,
  },

  closeButton: {
    backgroundColor: "#E52449",
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 10,
  },

  closeButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 16,
  },

  reportButton: {
    backgroundColor: "#003B60",
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 10,
  },

  reportButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },

  // MODAL BIENVENIDA / REPORTE
  welcomeOverlay: { ...baseOverlay },
  welcomeCard: { ...baseCard },
  welcomeTitle: { ...baseTitle },
  welcomeSubtitle: { ...baseSubtitle },
  welcomeButton: { ...baseButton, ...btnDanger },
  welcomeButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
  },

  reportOverlay: { ...baseOverlay },
  reportCard: { ...baseCard },
  reportTitle: { ...baseTitle },
  reportSubtitle: { ...baseSubtitle },
  reportButtonModal: { ...baseButton, ...btnDanger },
  reportButtonTextModal: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
  },

  modalTitle: {
    marginBottom: 12,   // separa título del texto
  },

  modalText: {
    marginBottom: 20,   // separa texto del botón
  },

  modalButton: {
    width: 160,         // botón más largo
    paddingVertical: 14,
    alignSelf: "center",
    borderRadius: 14,
  },


  // Mensaje "nuevo turno"
  newTurnNotice: {
    marginTop: 0,
    marginBottom: 40,
    backgroundColor: "rgba(0, 75, 118, 0.9)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },

  noticeWrapper: {
    height: 10,        // 🔥 espacio reservado para que NO empuje nada
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,      // para que quede más pegado a "TURNOS ACTIVOS"
  },


  newTurnNoticeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});










