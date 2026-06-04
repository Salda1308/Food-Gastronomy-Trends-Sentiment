// mobile/components/landing/FeaturesGrid.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, shadows } from "@/components/ui/tokens";

const FEATURES = [
  { tag: "NLP", title: "Sentiment\nAnalysis", desc: "VADER scores every Eater NY article daily." },
  { tag: "DATA", title: "Trend\nKeywords", desc: "TF-IDF extracts what the city is talking about." },
  { tag: "RECS", title: "Recipe\nMatching", desc: "Spoonacular recipes aligned to trending keywords." },
];

export function FeaturesGrid() {
  return (
    <View style={styles.grid}>
      {FEATURES.map((f) => (
        <View key={f.tag} style={styles.card}>
          <View style={styles.tagRow}>
            <Text style={styles.tag}>{f.tag}</Text>
          </View>
          <Text style={styles.title}>{f.title}</Text>
          <Text style={styles.desc}>{f.desc}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  card: {
    flex: 1,
    backgroundColor: colors.poster,
    padding: 14,
    borderTopWidth: 3,
    borderTopColor: colors.neon,
    ...shadows.poster,
  },
  tagRow: { marginBottom: 6 },
  tag: {
    fontFamily: fonts.bebas,
    fontSize: 9,
    letterSpacing: 2.5,
    color: colors.smoke,
  },
  title: {
    fontFamily: fonts.aero,
    fontSize: 20,
    color: colors.chalk,
    lineHeight: 22,
    marginBottom: 6,
  },
  desc: {
    fontFamily: fonts.display,
    fontSize: 11,
    color: colors.smoke,
    lineHeight: 16,
  },
});
