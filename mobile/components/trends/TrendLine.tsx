// mobile/components/trends/TrendLine.tsx
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { colors, fonts } from "@/components/ui/tokens";
import type { TrendPoint } from "@/lib/api";

export function TrendLine({ data }: { data: TrendPoint[] }) {
  const { width } = useWindowDimensions();

  if (!data.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>MOOD OVER TIME · 7-DAY TREND</Text>
        <Text style={styles.empty}>No trend data available yet.</Text>
      </View>
    );
  }

  if (data.length === 1) {
    const score = data[0].avg_sentiment;
    const moodText = score >= 0.2 ? "POSITIVE" : score <= -0.2 ? "NEGATIVE" : "MIXED";
    const moodColor = score >= 0.2 ? colors.chalk : score <= -0.2 ? colors.heat : colors.smoke;
    return (
      <View style={styles.container}>
        <Text style={styles.label}>MOOD OVER TIME · 7-DAY TREND</Text>
        <Text style={styles.singleWeek}>WEEK OF {data[0].week}</Text>
        <Text style={[styles.singleMood, { color: moodColor }]}>{moodText}</Text>
        <Text style={styles.singleHint}>Run the pipeline daily to build the trend over time.</Text>
      </View>
    );
  }

  const chartData = data.map((t) => ({
    value: (t.avg_sentiment + 1) * 50,
    label: t.week.slice(5),
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>MOOD OVER TIME · 7-DAY TREND</Text>
      <LineChart
        data={chartData}
        width={width - 80}
        height={120}
        color={colors.neon}
        thickness={2.5}
        dataPointsColor={colors.neon}
        dataPointsRadius={3}
        noOfSections={4}
        maxValue={100}
        yAxisColor="transparent"
        xAxisColor={colors.wire}
        rulesColor={colors.concrete}
        rulesType="solid"
        yAxisTextStyle={{ color: colors.smoke, fontSize: 10, fontFamily: fonts.bebas }}
        xAxisLabelTextStyle={{ color: colors.smoke, fontSize: 10, fontFamily: fonts.bebas }}
        backgroundColor={colors.poster}
        referenceLine1Config={{ color: colors.wire, dashWidth: 3, dashGap: 4 }}
        referenceLine1Position={50}
        curved
        areaChart
        startFillColor={colors.neon + "22"}
        endFillColor={colors.neon + "00"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  label: {
    fontFamily: fonts.bebas,
    fontSize: 14,
    letterSpacing: 2,
    color: colors.neon,
    marginBottom: 12,
  },
  empty: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.smoke,
    textAlign: "center",
    paddingVertical: 20,
  },
  singleWeek: {
    fontFamily: fonts.bebas,
    fontSize: 13,
    color: colors.smoke,
    letterSpacing: 1,
  },
  singleMood: {
    fontFamily: fonts.bebas,
    fontSize: 32,
    letterSpacing: 2,
    marginVertical: 4,
  },
  singleHint: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.smoke,
    lineHeight: 18,
  },
});
