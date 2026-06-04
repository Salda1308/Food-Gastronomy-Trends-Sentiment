// mobile/components/landing/KeywordsScroll.tsx
import { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, useWindowDimensions } from "react-native";
import { colors, fonts } from "@/components/ui/tokens";

const KEYWORDS = [
  "omakase", "birria", "wagyu", "natural wine", "soba", "smashburger",
  "omakase", "birria", "wagyu", "natural wine", "soba", "smashburger",
];

export function KeywordsScroll() {
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scrollX, {
        toValue: -width * 2,
        duration: 14000,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [width]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.track, { transform: [{ translateX: scrollX }] }]}>
        {KEYWORDS.map((kw, i) => (
          <Text key={i} style={[styles.keyword, i % 2 === 0 && styles.keywordAlt]}>
            {kw.toUpperCase()} ·{" "}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden", paddingVertical: 10 },
  track: { flexDirection: "row", alignItems: "center" },
  keyword: {
    fontFamily: fonts.bebas,
    fontSize: 13,
    letterSpacing: 3,
    color: colors.smoke,
  },
  keywordAlt: { color: colors.wire },
});
