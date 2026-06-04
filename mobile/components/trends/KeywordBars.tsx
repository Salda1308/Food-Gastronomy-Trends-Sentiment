// mobile/components/trends/KeywordBars.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "@/components/ui/tokens";
import type { KeywordItem } from "@/lib/api";

const BAR_COLOR: Record<string, string> = {
  positive: colors.neon,
  negative: colors.heat,
  neutral:  colors.smoke,
};

function scoreLabel(score: number, sentiment: string): string {
  const abs = Math.abs(score);
  if (sentiment === "positive") {
    if (abs >= 0.8) return "Highly trending";
    if (abs >= 0.5) return "Trending";
    if (abs >= 0.3) return "Growing";
    return "Mentioned";
  }
  if (sentiment === "negative") {
    if (abs >= 0.5) return "Criticized";
    return "Mixed reviews";
  }
  return "Neutral";
}

export function KeywordBars({ data }: { data: KeywordItem[] }) {
  const sorted = [...data]
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 10);
  const max = Math.max(...sorted.map((d) => Math.abs(d.score)), 0.01);

  return (
    <View style={styles.container}>
      {sorted.map((item, rank) => (
        <View key={item.keyword} style={styles.row}>
          <Text style={styles.rank}>{String(rank + 1).padStart(2, "0")}</Text>
          <Text
            style={[styles.keyword, rank === 0 && { color: colors.neon }]}
            numberOfLines={1}
          >
            {item.keyword.toUpperCase()}
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${(Math.abs(item.score) / max) * 100}%`,
                  backgroundColor: BAR_COLOR[item.label] ?? colors.smoke,
                },
              ]}
            />
          </View>
          <Text
            style={[styles.scoreLabel, { color: BAR_COLOR[item.label] ?? colors.smoke }]}
            numberOfLines={1}
          >
            {scoreLabel(item.score, item.label)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rank: {
    fontFamily: fonts.bebas,
    fontSize: 13,
    color: colors.smoke,
    width: 22,
    textAlign: "right",
  },
  keyword: {
    fontFamily: fonts.aero,
    fontSize: 15,
    color: colors.chalk,
    width: 96,
    letterSpacing: 0.5,
  },
  barTrack: { flex: 1, height: 10, backgroundColor: colors.concrete },
  barFill: { height: "100%", minWidth: 2 },
  scoreLabel: {
    fontFamily: fonts.display,
    fontSize: 13,
    width: 90,
    textAlign: "right",
  },
});
