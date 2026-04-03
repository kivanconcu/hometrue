import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import HomeScreen from "./src/screens/HomeScreen";
import ResultsScreen from "./src/screens/ResultsScreen";

const Stack = createStackNavigator();

const DarkNavTheme = {
  dark: true,
  colors: {
    primary: "#22c55e",
    background: "#0f1729",
    card: "#0f1729",
    text: "#ffffff",
    border: "rgba(255,255,255,0.1)",
    notification: "#22c55e",
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0f1729" }}>
      <SafeAreaProvider style={{ backgroundColor: "#0f1729" }}>
      <StatusBar style="light" backgroundColor="#0f1729" />
      <NavigationContainer theme={DarkNavTheme}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0f1729" },
            cardStyle: { backgroundColor: "#0f1729" },
          }}
          initialRouteName="Home"
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Results" component={ResultsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
