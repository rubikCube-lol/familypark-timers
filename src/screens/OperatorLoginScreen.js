import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';

import { supabase } from '../../supabase/supabaseClient';


const { width } = Dimensions.get("window");

// tamaño base (responsive)
const BASE_LOGO_WIDTH = width * 0.85;

// límite máximo solo para pantallas grandes
const MAX_LOGO_WIDTH = 420; // tú puedes ajustarlo

const FINAL_LOGO_WIDTH = Math.min(BASE_LOGO_WIDTH, MAX_LOGO_WIDTH);
const FINAL_LOGO_HEIGHT = FINAL_LOGO_WIDTH * 0.38;
 

export default function OperatorLoginScreen({ navigation }) {
  const [localCode, setLocalCode] = useState('');
  const [operatorCode, setOperatorCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const logoImage = require('../../assets/logo-familypark.png');

  // -----------------------------------------------------------
  // 🔐 LOGIN PRINCIPAL
  // -----------------------------------------------------------
  async function handleLogin() {
    setError('');
    setLoading(true);

    try {
      if (!localCode.trim() || !operatorCode.trim()) {
        setError('Debes ingresar ambos códigos');
        setLoading(false);
        return;
      }

      const localCodeClean = localCode.trim().toUpperCase();
      const operatorCodeClean = operatorCode.trim().toUpperCase();

      // 1) Buscar LOCAL
      const { data: localData, error: localErr } = await supabase
        .from('locals')
        .select('id, name, code, zone_type')
        .eq('code', localCodeClean)
        .maybeSingle();

      if (localErr || !localData) {
        setError('Código de local inválido');
        setLoading(false);
        return;
      }

      const { id: localId, name: localName, zone_type: zoneType } = localData;

      // 2) Buscar OPERADOR
      const { data: opData, error: opErr } = await supabase
        .from('operators')
        .select('id, name, login_code, active, local_id')
        .eq('login_code', operatorCodeClean)
        .eq('local_id', localId)
        .maybeSingle();

      if (opErr || !opData) {
        setError('Código de operador inválido o no pertenece a este local');
        setLoading(false);
        return;
      }

      if (!opData.active) {
        setError('El operador está inactivo');
        setLoading(false);
        return;
      }

      // Extraer datos correctos
      const opId = opData.id;
      const opName = opData.name;

      setLoading(false);

      // 🚀 NAVEGACIÓN CORRECTA
      navigation.reset({
        index: 0,
        routes: [{
          name: "Zones",
          params: {
            operatorId: opId,
            operatorName: opName,
            localId: localId,
            zoneType: zoneType
          }
        }]
      });

    } catch (e) {
      console.log("Login error:", e);
      setError('Error inesperado. Intenta otra vez.');
      setLoading(false);
    }
  }

  // -----------------------------------------------------------
  // ⌨️ HABILITAR ENTER PARA INICIAR SESIÓN EN WEB
  // -----------------------------------------------------------

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        handleLogin();
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [localCode, operatorCode]);



  return (
    <ImageBackground
      source={require('../../assets/bg-home.png')}
      style={styles.bg}
    >
    <View style={styles.logoContainer}>
        <Image source={logoImage} style={styles.logo} resizeMode="contain" />
    </View>

      <View style={styles.card}>

        <Text style={styles.title}>¡BIENVENIDO!</Text>

        <TextInput
          style={styles.input}
          placeholder="Ingresa el código de tu local"
          placeholderTextColor="#777"
          value={localCode}
          onChangeText={setLocalCode}
          autoCapitalize="characters"
        />

        <TextInput
          style={styles.input}
          placeholder="Ingresa tu código de operador"
          placeholderTextColor="#777"
          value={operatorCode}
          onChangeText={setOperatorCode}
          autoCapitalize="characters"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>INGRESAR</Text>
          )}
        </TouchableOpacity>

      </View>
    </ImageBackground>
  );
}

// -----------------------------------------------------------
// 🎨 ESTILOS
// -----------------------------------------------------------
const styles = StyleSheet.create({
  bg: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    backgroundColor: 'rgba(255,255,255,0.85)',
    padding: 25,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#004E7C',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    color: '#004E7C',
    marginBottom: 20,
  },

  input: {
    width: '100%',
    height: 55,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    borderWidth: 2,
    borderColor: '#004E7C',
    marginBottom: 10,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
    backgroundColor: '#004E7C',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoContainer: {
    marginTop: -20,
    alignItems: 'center',
  },
  logo: {
    width: FINAL_LOGO_WIDTH,
    height: FINAL_LOGO_HEIGHT,
  },

});

