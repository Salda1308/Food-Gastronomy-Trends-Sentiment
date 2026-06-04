// mobile/components/landing/HeroSection.tsx
import { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts } from "@/components/ui/tokens";

export function HeroSection() {
  const router = useRouter();

  const glitchX1 = useRef(new Animated.Value(0)).current;
  const glitchX2 = useRef(new Animated.Value(0)).current;
  const glitchOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(3500),
        Animated.parallel([
          Animated.timing(glitchOp, { toValue: 0.85, duration: 40, useNativeDriver: true }),
          Animated.timing(glitchX1, { toValue: -3, duration: 40, useNativeDriver: true }),
          Animated.timing(glitchX2, { toValue: 3, duration: 40, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(glitchX1, { toValue: 2, duration: 40, useNativeDriver: true }),
          Animated.timing(glitchX2, { toValue: -2, duration: 40, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(glitchOp, { toValue: 0, duration: 40, useNativeDriver: true }),
          Animated.timing(glitchX1, { toValue: 0, duration: 40, useNativeDriver: true }),
          Animated.timing(glitchX2, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>GASTRONOMIC INTELLIGENCE · NYC</Text>
      </View>

      <View style={{ alignItems: "center" }}>
        <Text style={styles.sub}>Empire's</Text>
        <View>
          <Text style={styles.title}>TASTE.</Text>
          <Animated.Text
            style={[styles.title, styles.glitch1, { opacity: glitchOp, transform: [{ translateX: glitchX1 }] }]}
          >
            TASTE.
          </Animated.Text>
          <Animated.Text
            style={[styles.title, styles.glitch2, { opacity: glitchOp, transform: [{ translateX: glitchX2 }] }]}
          >
            TASTE.
          </Animated.Text>
        </View>
      </View>

      <Text style={styles.body}>
        Eater NY articles + Spoonacular recipes — processed through a sentiment pipeline daily.
        Read the street like data.
      </Text>

      <TouchableOpacity
        style={styles.cta}
        onPress={() => router.push("/login")}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaText}>ENTER DASHBOARD →</Text>
      </TouchableOpacity>

      <Text style={styles.footnote}>— 5,000 recipes · updated daily —</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    gap: 16,
  },
  badge: {
    borderWidth: 1,
    borderColor: "rgba(238,234,226,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fonts.bebas,
    fontSize: 9,
    letterSpacing: 3,
    color: "rgba(238,234,226,0.5)",
  },
  sub: {
    fontFamily: fonts.aero,
    fontSize: 36,
    color: colors.chalk,
    opacity: 0.9,
    letterSpacing: 2,
  },
  title: {
    fontFamily: fonts.bebas,
    fontSize: 88,
    color: colors.neon,
    lineHeight: 80,
    textAlign: "center",
    letterSpacing: 4,
  },
  glitch1: {
    position: "absolute",
    color: colors.heat,
    top: 0,
    left: 0,
  },
  glitch2: {
    position: "absolute",
    color: colors.neon,
    top: 0,
    left: 0,
    opacity: 0.6,
  },
  body: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: "rgba(110,108,104,0.85)",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
    marginTop: 8,
  },
  cta: {
    borderWidth: 2,
    borderColor: "rgba(238,234,226,0.6)",
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  ctaText: {
    fontFamily: fonts.bebas,
    fontSize: 14,
    letterSpacing: 3,
    color: colors.chalk,
  },
  footnote: {
    fontFamily: fonts.bebas,
    fontSize: 10,
    letterSpacing: 2,
    color: "rgba(110,108,104,0.7)",
  },
});
