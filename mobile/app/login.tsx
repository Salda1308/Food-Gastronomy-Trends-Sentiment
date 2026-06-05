// mobile/app/login.tsx
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { colors, fonts, shadows } from "@/components/ui/tokens";
import { useAuth } from "@/hooks/useAuth";

const url = process.env.EXPO_PUBLIC_API_URL ?? "";
const IS_DEV = url.includes("localhost") ||
               url.includes("192.168") ||
               url.includes("10.") ||
               url.includes("172.");

export default function LoginScreen() {
  const { signIn, loading, request } = useAuth();
  const router = useRouter();

  const devBypass = async () => {
    const fakeUser = { email: "dev@test.com", name: "Dev User", picture: null };
    await SecureStore.setItemAsync("google_user", JSON.stringify(fakeUser));
    router.replace("/trends");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.logoArea}>
          <Text style={styles.logoTitle}>{"EMPIRE'S\nTASTE."}</Text>
          <Text style={styles.logoSub}>NYC Gastronomy Intelligence</Text>
        </View>

        <View style={styles.divider} />

        {loading ? (
          <ActivityIndicator color={colors.neon} />
        ) : (
          <TouchableOpacity
            style={[styles.googleBtn, !request && styles.disabled]}
            onPress={signIn}
            disabled={!request}
            activeOpacity={0.8}
          >
            <Text style={styles.googleBtnText}>SIGN IN WITH GOOGLE</Text>
          </TouchableOpacity>
        )}

        {IS_DEV && (
          <TouchableOpacity style={styles.devBtn} onPress={devBypass}>
            <Text style={styles.devBtnText}>DEV — SKIP LOGIN →</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footnote}>Your data stays on your device.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.wall },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 24,
  },
  logoArea: { alignItems: "center", gap: 8 },
  logoTitle: {
    fontFamily: fonts.aero,
    fontSize: 64,
    color: colors.neon,
    textAlign: "center",
    lineHeight: 60,
  },
  logoSub: {
    fontFamily: fonts.bebas,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.smoke,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: colors.wire,
    marginVertical: 8,
  },
  googleBtn: {
    backgroundColor: colors.heat,
    paddingHorizontal: 32,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
    ...shadows.tag,
  },
  disabled: { opacity: 0.5 },
  googleBtnText: {
    fontFamily: fonts.bebas,
    fontSize: 16,
    letterSpacing: 3,
    color: colors.chalk,
  },
  devBtn: {
    borderWidth: 1,
    borderColor: colors.wire,
    paddingHorizontal: 24,
    paddingVertical: 10,
    width: "100%",
    alignItems: "center",
  },
  devBtnText: {
    fontFamily: fonts.bebas,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.smoke,
  },
  footnote: {
    fontFamily: fonts.display,
    fontSize: 11,
    color: colors.smoke,
  },
});
