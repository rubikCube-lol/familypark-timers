import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get("window");

// tamaño base (responsive)
const BASE_LOGO_WIDTH = width * 0.85;

// límite máximo solo para pantallas grandes
const MAX_LOGO_WIDTH = 420; // tú puedes ajustarlo

const FINAL_LOGO_WIDTH = Math.min(BASE_LOGO_WIDTH, MAX_LOGO_WIDTH);
const FINAL_LOGO_HEIGHT = FINAL_LOGO_WIDTH * 0.38;

const bgImage = require('../../assets/bg-home.png');
const logoImage = require('../../assets/logo-familypark.png');

export default function HomeScreen({ navigation }) {
  return (
    <ImageBackground source={bgImage} style={styles.background}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* LOGO */}
          <View style={styles.logoContainer}>
            <Image source={logoImage} style={styles.logo} resizeMode="contain" />
          </View>

          <Text style={styles.slogan}>
            ¿LISTO PARA LA DIVERSION?
          </Text>


          {/* BOTONES */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => navigation.navigate('OperatorLogin')}
            >
              <Text style={[styles.buttonText, styles.buttonTextPrimary]}>
                INICIAR SESION
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 60,
  },
  logoContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  
  logo: {
    width: FINAL_LOGO_WIDTH,
    height: FINAL_LOGO_HEIGHT,
  },


  buttonsRow: {
    justifyContent: 'center',
  },

  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
  },
  buttonPrimary: {
    backgroundColor: "#00476F",
    borderColor: "#FFFFFF",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#FFFFFF",
    textAlign: "center",
  },

  buttonTextPrimary: {
    color: '#FFFFFF',
  },

  slogan: {
    marginTop: 10,
    marginBottom: 40,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

});
