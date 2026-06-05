import { useEffect, useRef } from "react";
import { Alert, AppState, AppStateStatus } from "react-native";
import * as SecureStore from "expo-secure-store";

const LAST_PARTITION_KEY = "last_partition_date";
const API = process.env.EXPO_PUBLIC_API_URL ?? "";

async function fetchPartitionDate(): Promise<string | null> {
  try {
    const res = await fetch(`${API}/api/storytelling/sentiment`, { cache: "no-store" } as RequestInit);
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json.partition_date === "string" ? json.partition_date : null;
  } catch {
    return null;
  }
}

export function useDataUpdateAlert() {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    async function checkForUpdate() {
      const latest = await fetchPartitionDate();
      if (!latest) return;

      const stored = await SecureStore.getItemAsync(LAST_PARTITION_KEY);

      if (stored && stored !== latest) {
        Alert.alert(
          "New data available",
          "The NYC food trends have been updated. Pull to refresh for the latest insights.",
          [{ text: "Got it", style: "default" }]
        );
      }

      await SecureStore.setItemAsync(LAST_PARTITION_KEY, latest);
    }

    // Check on mount
    checkForUpdate();

    // Check every time the app comes to the foreground
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        checkForUpdate();
      }
      appState.current = next;
    });

    return () => sub.remove();
  }, []);
}
