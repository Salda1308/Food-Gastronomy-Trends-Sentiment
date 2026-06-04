// mobile/hooks/useAuth.ts
import { useEffect, useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

const TOKEN_KEY = "google_access_token";
const USER_KEY  = "google_user";

export interface AuthUser {
  email: string;
  name: string;
  picture?: string;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const redirectUri = AuthSession.makeRedirectUri({ scheme: "empirestaste" });
  console.log("🔑 OAuth redirect URI:", redirectUri);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId:        process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId:     process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    redirectUri,
  });

  // Restore session on mount
  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(USER_KEY);
      if (stored) setUser(JSON.parse(stored));
      setLoading(false);
    })();
  }, []);

  // Handle OAuth response
  useEffect(() => {
    if (response?.type !== "success") return;
    const token = response.authentication?.accessToken;
    if (!token) return;

    (async () => {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      const res  = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const info: AuthUser = await res.json();
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(info));
      setUser(info);
      router.replace("/trends");
    })();
  }, [response]);

  const signIn = () => promptAsync();

  const signOut = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setUser(null);
    router.replace("/");
  };

  return { user, loading, signIn, signOut, request };
}
