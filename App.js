import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import OperatorLoginScreen from './src/screens/OperatorLoginScreen';
import ZonesScreen from './src/screens/ZonesScreen';
import OperatorPanelScreen from './src/screens/OperatorPanelScreen';
import TvScreen from './src/screens/TvScreen';
import * as Linking from 'expo-linking';

const Stack = createNativeStackNavigator();

export default function App() {

  const linking = {
    prefixes: ['http://localhost:8081', 'exp://*'],
    config: {
      screens: {
        Home: '',
        OperatorLogin: 'operador',
        Zones: 'zonas',
        OperatorPanel: 'panel',
        // ❌ Eliminado FinishedSessions porque ya no existe
        // TvScreen opcional dependiendo si lo usas
        TvScreen: "pantalla/:zoneId/:localId",
      },
    },
  };

  const isWebTV =
    typeof window !== "undefined" &&
    window.location.hash.startsWith("#/tv");

  if (isWebTV) {
    return (
      <NavigationContainer linking={linking}>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="OperatorLogin" component={OperatorLoginScreen} />
          <Stack.Screen name="Zones" component={ZonesScreen} />
          <Stack.Screen name="OperatorPanel" component={OperatorPanelScreen} />
          <Stack.Screen name="TvScreen" component={TvScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }
}
