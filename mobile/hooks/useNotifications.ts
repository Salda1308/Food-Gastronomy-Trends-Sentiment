import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

const API = process.env.EXPO_PUBLIC_API_URL ?? "";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerToken() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  let token: string;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    token = tokenData.data;
  } catch {
    // No projectId available (development without EAS) — skip registration
    return;
  }

  if (!API || !token) return;

  await fetch(`${API}/api/notify/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).catch(() => {});
}

export function useNotifications() {
  useEffect(() => {
    registerToken();

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("pipeline", {
        name: "Pipeline updates",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  }, []);
}
