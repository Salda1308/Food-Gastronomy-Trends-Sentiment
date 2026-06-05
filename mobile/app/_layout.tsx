// mobile/app/_layout.tsx
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { useDataUpdateAlert } from "@/hooks/useDataUpdateAlert";

// Intercepts OAuth redirects before Expo Router tries to render them as pages
WebBrowser.maybeCompleteAuthSession();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router   = useRouter();
  const segments = useSegments();
  useDataUpdateAlert();
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn]   = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Aerosoldier: require("../assets/fonts/Aerosoldier.otf"),
    "CreatoDisplay-Regular": require("../assets/fonts/CreatoDisplay-Regular.otf"),
    BebasNeue_400Regular,
  });

  useEffect(() => {
    (async () => {
      const user = await SecureStore.getItemAsync("google_user");
      setIsLoggedIn(!!user);
      setAuthChecked(true);
    })();
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && authChecked) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, authChecked]);

  // Only redirect to dashboard on first load if already logged in.
  useEffect(() => {
    if (!authChecked || (!fontsLoaded && !fontError)) return;
    if (isLoggedIn) {
      router.replace("/trends");
    }
  }, [authChecked, isLoggedIn, fontsLoaded, fontError]); // eslint-disable-line react-hooks/exhaustive-deps

  if ((!fontsLoaded && !fontError) || !authChecked) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0d0d0f" } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(dashboard)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
