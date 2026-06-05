// mobile/app/(dashboard)/trends.tsx
import { ScrollView, View, Text, RefreshControl, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { getSentiment, getKeywords, getTrend, getEntities, getSummary } from "@/lib/api";
import { SentimentDonut } from "@/components/trends/SentimentDonut";
import { TrendLine } from "@/components/trends/TrendLine";
import { KeywordBars } from "@/components/trends/KeywordBars";
import { EntityTable } from "@/components/trends/EntityTable";
import { colors, fonts, shadows } from "@/components/ui/tokens";

function moodLabel(compound: number | null | undefined): { text: string; color: string } {
  if (compound == null) return { text: "NO DATA",       color: colors.smoke };
  if (compound >= 0.5)  return { text: "VERY POSITIVE", color: colors.chalk };
  if (compound >= 0.2)  return { text: "POSITIVE",      color: colors.neon };
  if (compound >= -0.2) return { text: "MIXED",         color: colors.smoke };
  if (compound >= -0.5) return { text: "NEGATIVE",      color: colors.heat };
  return                       { text: "VERY NEGATIVE", color: colors.heat };
}

export default function TrendsScreen() {
  const sentiment = useApi(getSentiment);
  const keywords  = useApi(() => getKeywords(10));
  const trend     = useApi(getTrend);
  const entities  = useApi(getEntities);
  const summary   = useApi(getSummary);

  const apiError   = sentiment.error ?? keywords.error ?? trend.error ?? entities.error;
  const refreshing = sentiment.loading || keywords.loading;

  const onRefresh = () => {
    sentiment.refetch();
    keywords.refetch();
    trend.refetch();
    entities.refetch();
    summary.refetch();
  };

  const compound   = sentiment.data?.avg_compound;
  const mood       = moodLabel(compound);
  const pctPos     = sentiment.data?.positive ?? summary.data?.pct_positive ?? null;
  const topKeyword = summary.data?.top_keyword ?? null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} />
        }
      >
        {/* API error banner */}
        {apiError && !sentiment.data && (
          <View style={{ backgroundColor: colors.heat, padding: 12, margin: 16 }}>
            <Text style={{ fontFamily: fonts.bebas, fontSize: 13, letterSpacing: 2, color: colors.chalk }}>
              API ERROR · {apiError}
            </Text>
          </View>
        )}

        {/* Hero strip */}
        <View style={styles.hero}>
          <View style={styles.heroTags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>TONIGHT IN NYC</Text>
            </View>
          </View>

          <Text style={styles.headline}>
            {topKeyword
              ? `The city is eating\n`
              : "NYC food\n"}
            <Text style={{ color: colors.neon }}>
              {topKeyword ?? "intelligence."}
            </Text>
            {topKeyword ? "." : ""}
          </Text>

          {pctPos != null && (
            <Text style={styles.moodDesc}>
              {Math.round(pctPos)}% of articles and diner reviews are positive
            </Text>
          )}

          {/* Big % number */}
          <View style={styles.moodRow}>
            <View>
              <Text style={styles.bigNumber}>
                {pctPos != null ? `${Math.round(pctPos)}%` : "—"}
              </Text>
              <Text style={[styles.moodLabel, { color: mood.color }]}>
                {mood.text}
              </Text>
              <Text style={styles.bigNumberLabel}>OVERALL MOOD</Text>
            </View>
          </View>
        </View>

        {/* Sentiment donut */}
        {sentiment.data && (
          <View style={[styles.card, { borderTopWidth: 4, borderTopColor: colors.neon }]}>
            <SentimentDonut data={sentiment.data} />
          </View>
        )}

        {/* Trend line */}
        {trend.data && trend.data.length > 0 && (
          <View style={styles.card}>
            <TrendLine data={trend.data} />
          </View>
        )}

        {/* Keyword board */}
        {keywords.data && keywords.data.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>What NYC is talking about this week</Text>
            <Text style={styles.cardTitle}>THE BOARD</Text>
            <KeywordBars data={keywords.data} />
          </View>
        )}

        {entities.data && <EntityTable data={entities.data} />}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.wall },
  hero: {
    backgroundColor: colors.concrete,
    borderBottomWidth: 4,
    borderBottomColor: colors.neon,
    padding: 24,
    gap: 10,
  },
  heroTags: { flexDirection: "row", gap: 8, marginBottom: 4 },
  tag: { backgroundColor: colors.neon, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: {
    fontFamily: fonts.bebas,
    fontSize: 12,
    letterSpacing: 2.5,
    color: colors.poster,
  },
  headline: {
    fontFamily: fonts.aero,
    fontSize: 36,
    color: colors.chalk,
    lineHeight: 40,
    textTransform: "uppercase",
  },
  moodDesc: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.smoke,
    lineHeight: 20,
  },
  moodRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  bigNumber: {
    fontFamily: fonts.bebas,
    fontSize: 72,
    color: colors.chalk,
    lineHeight: 70,
    letterSpacing: -1,
    textAlign: "right",
  },
  moodLabel: {
    fontFamily: fonts.bebas,
    fontSize: 16,
    letterSpacing: 2,
    textAlign: "right",
  },
  bigNumberLabel: {
    fontFamily: fonts.bebas,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.smoke,
    textAlign: "right",
  },
  card: {
    backgroundColor: colors.poster,
    marginHorizontal: 16,
    marginTop: 16,
    ...shadows.poster,
  },
  cardSubtitle: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.smoke,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cardTitle: {
    fontFamily: fonts.aero,
    fontSize: 28,
    color: colors.chalk,
    letterSpacing: 2,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderLeftWidth: 6,
    borderLeftColor: colors.neon,
    marginBottom: 4,
  },
});
