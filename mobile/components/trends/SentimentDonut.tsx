// mobile/components/trends/SentimentDonut.tsx
import { View, Text, StyleSheet } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { colors, fonts } from "@/components/ui/tokens";
import type { SentimentData } from "@/lib/api";

const DONUT_COLORS = {
  positive: colors.neon,
  negative: colors.heat,
  neutral:  colors.smoke,
};

function interpretationText(positive: number): string {
  if (positive >= 80) return "The food scene is thriving — a great week to explore new spots.";
  if (positive >= 60) return "Mostly upbeat coverage. Good time to try trending restaurants.";
  if (positive >= 40) return "Mixed reactions this week. Worth researching before you book.";
  return "More criticism than usual. Stick to proven favorites this week.";
}

export function SentimentDonut({ data }: { data: SentimentData }) {
  const pieData = [
    { value: data.positive || 0.001, color: DONUT_COLORS.positive },
    { value: data.negative || 0.001, color: DONUT_COLORS.negative },
    { value: data.neutral  || 0.001, color: DONUT_COLORS.neutral  },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>How diners &amp; media feel about NYC food</Text>
      <Text style={styles.interpretation}>{interpretationText(data.positive)}</Text>

      <View style={styles.chartWrap}>
        <PieChart
          data={pieData}
          donut
          innerRadius={52}
          radius={72}
          showText={false}
          centerLabelComponent={() => (
            <View style={{ alignItems: "center" }}>
              <Text style={styles.center}>{data.positive.toFixed(0)}%</Text>
              <Text style={styles.centerSub}>positive</Text>
            </View>
          )}
        />
      </View>

      <View style={styles.legend}>
        {[
          { label: "Positive", color: DONUT_COLORS.positive, value: data.positive },
          { label: "Negative", color: DONUT_COLORS.negative, value: data.negative },
          { label: "Neutral",  color: DONUT_COLORS.neutral,  value: data.neutral  },
        ].map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.label}</Text>
            <Text style={[styles.legendPct, { color: s.color }]}>
              {s.value.toFixed(0)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", padding: 16, gap: 6 },
  label: {
    fontFamily: fonts.bebas,
    fontSize: 14,
    letterSpacing: 1.5,
    color: colors.chalk,
    textAlign: "center",
  },
  interpretation: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.smoke,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 4,
  },
  chartWrap: { marginVertical: 8 },
  center: {
    fontFamily: fonts.bebas,
    fontSize: 26,
    color: colors.chalk,
  },
  centerSub: {
    fontFamily: fonts.bebas,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.smoke,
  },
  legend: { flexDirection: "row", gap: 16, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 0 },
  legendText: {
    fontFamily: fonts.bebas,
    fontSize: 13,
    letterSpacing: 1.5,
    color: colors.smoke,
  },
  legendPct: {
    fontFamily: fonts.bebas,
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
