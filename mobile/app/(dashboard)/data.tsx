// mobile/app/(dashboard)/data.tsx
import {
  ScrollView, View, Text, StyleSheet, RefreshControl, ActivityIndicator, Linking, TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { getGovernanceKpis, getNullRates, getSources } from "@/lib/api";
import { KpiCard } from "@/components/data/KpiCard";
import { NullRateBar } from "@/components/data/NullRateBar";
import { colors, fonts, shadows } from "@/components/ui/tokens";

function flagged(v: number | undefined, threshold: number, dir: "above" | "below"): boolean {
  if (v == null) return false;
  return dir === "above" ? v > threshold : v < threshold;
}

export default function DataScreen() {
  const kpis      = useApi(getGovernanceKpis);
  const nullRates = useApi(getNullRates);
  const sources   = useApi(getSources);

  const loading = kpis.loading || nullRates.loading;

  const onRefresh = () => {
    kpis.refetch();
    nullRates.refetch();
    sources.refetch();
  };

  const kpiItems = kpis.data ? [
    {
      label:    "Records collected",
      sublabel: "Total recipes + articles processed",
      value:    kpis.data.total_records?.toLocaleString() ?? "—",
      bad: false,
    },
    {
      label:    "Missing data",
      sublabel: "Fields with null values",
      value:    `${kpis.data.max_null_rate?.toFixed(1) ?? "—"}%`,
      bad: flagged(kpis.data.max_null_rate, 20, "above"),
    },
    {
      label:    "Data quality",
      sublabel: "Records passing schema checks",
      value:    `${kpis.data.schema_compliance?.toFixed(1) ?? "—"}%`,
      bad: flagged(kpis.data.schema_compliance, 90, "below"),
    },
    {
      label:    "Duplicates",
      sublabel: "Repeated entries removed",
      value:    `${kpis.data.duplicate_rate?.toFixed(1) ?? "—"}%`,
      bad: flagged(kpis.data.duplicate_rate, 5, "above"),
    },
  ] : [];

  const layers = [
    { name: "BRONZE", desc: "Raw collection — Eater NY articles, OpenTable reviews, Spoonacular recipes", color: colors.neon },
    { name: "SILVER", desc: "Cleaned, deduplicated and ready for analysis",                               color: colors.smoke },
    { name: "GOLD",   desc: "Sentiment scoring (VADER), keyword extraction, restaurant entity detection", color: colors.neon },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.neon} />}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Bronze → Silver → Gold pipeline · Apache Airflow</Text>
          <Text style={styles.heading}>The line.</Text>
        </View>

        {loading && !kpis.data ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.neon} />
        ) : kpis.data ? (
          <>
            {/* KPI grid */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiRow}>
                {kpiItems.slice(0, 2).map((k) => <KpiCard key={k.label} {...k} />)}
              </View>
              <View style={styles.kpiRow}>
                {kpiItems.slice(2, 4).map((k) => <KpiCard key={k.label} {...k} />)}
              </View>
            </View>

            {/* Pipeline layers */}
            <View style={[styles.card, { padding: 16 }]}>
              <Text style={styles.cardLabel}>How the pipeline works</Text>
              {layers.map((l, i) => (
                <View key={l.name}>
                  <View style={styles.layerRow}>
                    <View style={[styles.layerDot, { backgroundColor: l.color }]} />
                    <Text style={styles.layerName}>{l.name}</Text>
                    <Text style={styles.layerDesc}>{l.desc}</Text>
                  </View>
                  {i < layers.length - 1 && <Text style={styles.arrow}>↓</Text>}
                </View>
              ))}
            </View>

            {/* Articles */}
            {sources.data && sources.data.articles.count > 0 && (
              <View style={[styles.card, { padding: 16 }]}>
                <View style={styles.sourceHeader}>
                  <Text style={styles.sourceCount}>{sources.data.articles.count}</Text>
                  <View>
                    <Text style={styles.sourceTitle}>Articles collected</Text>
                    <Text style={styles.sourceSubtitle}>Eater NY — food & restaurant news</Text>
                  </View>
                </View>
                {sources.data.articles.items.slice(0, 6).map((a, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.articleRow}
                    onPress={() => a.url && Linking.openURL(a.url)}
                  >
                    <Text style={styles.articleNum}>{String(i + 1).padStart(2, "0")}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.articleTitle} numberOfLines={1}>{a.title || "Untitled"}</Text>
                      <Text style={styles.articleDate}>{a.published_date}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Reviews */}
            {sources.data && sources.data.reviews.count > 0 && (
              <View style={[styles.card, { padding: 16 }]}>
                <View style={styles.sourceHeader}>
                  <Text style={styles.sourceCount}>{sources.data.reviews.count}</Text>
                  <View>
                    <Text style={styles.sourceTitle}>Reviews collected</Text>
                    <Text style={styles.sourceSubtitle}>OpenTable — real diner reviews</Text>
                  </View>
                </View>
                {sources.data.reviews.by_restaurant.slice(0, 8).map((r, i) => (
                  <View key={i} style={styles.reviewRow}>
                    <Text style={styles.articleNum}>{String(i + 1).padStart(2, "0")}</Text>
                    <Text style={styles.articleTitle} numberOfLines={1}>{r.restaurant}</Text>
                    <Text style={styles.reviewCount}>{r.count} reviews</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Null rates */}
            {nullRates.data && nullRates.data.length > 0 && (
              <View style={[styles.card, { paddingTop: 16 }]}>
                <Text style={[styles.cardLabel, { paddingHorizontal: 16 }]}>
                  Data completeness by field
                </Text>
                <Text style={[styles.cardDesc, { paddingHorizontal: 16 }]}>
                  Shows missing data percentage per field. Under 20% is healthy.
                </Text>
                <View style={{ marginTop: 10 }}>
                  <NullRateBar data={nullRates.data} />
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>NO PIPELINE DATA</Text>
            <Text style={styles.emptyBody}>Run the pipeline to populate metrics.</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.wall },
  header: { padding: 20, paddingBottom: 8 },
  eyebrow: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.smoke,
    marginBottom: 6,
  },
  heading: {
    fontFamily: fonts.aero,
    fontSize: 44,
    color: colors.chalk,
    lineHeight: 46,
  },
  kpiGrid: { paddingHorizontal: 16, marginTop: 8, gap: 8 },
  kpiRow: { flexDirection: "row", gap: 8 },
  card: {
    backgroundColor: colors.poster,
    marginHorizontal: 16,
    marginTop: 12,
    ...shadows.poster,
  },
  cardLabel: {
    fontFamily: fonts.bebas,
    fontSize: 15,
    letterSpacing: 2,
    color: colors.chalk,
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.smoke,
    lineHeight: 18,
    marginBottom: 8,
  },
  layerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  layerDot: { width: 8, height: 8, borderRadius: 0 },
  layerName: {
    fontFamily: fonts.aero,
    fontSize: 16,
    color: colors.chalk,
    width: 70,
  },
  layerDesc: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.smoke,
    flex: 1,
    lineHeight: 18,
  },
  arrow: {
    fontFamily: fonts.bebas,
    fontSize: 16,
    color: colors.neon,
    marginLeft: 18,
    marginVertical: 2,
  },
  sourceHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  sourceCount: {
    fontFamily: fonts.bebas,
    fontSize: 40,
    color: colors.neon,
    lineHeight: 40,
  },
  sourceTitle: {
    fontFamily: fonts.bebas,
    fontSize: 15,
    letterSpacing: 1.5,
    color: colors.chalk,
  },
  sourceSubtitle: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.smoke,
  },
  articleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: colors.wire,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: colors.wire,
  },
  articleNum: {
    fontFamily: fonts.bebas,
    fontSize: 12,
    color: colors.smoke,
    width: 22,
    textAlign: "right",
    marginTop: 2,
  },
  articleTitle: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.chalk,
    flex: 1,
    lineHeight: 18,
  },
  articleDate: {
    fontFamily: fonts.bebas,
    fontSize: 12,
    color: colors.smoke,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  reviewCount: {
    fontFamily: fonts.bebas,
    fontSize: 13,
    color: colors.neon,
    letterSpacing: 0.5,
  },
  empty: { alignItems: "center", padding: 40, gap: 8 },
  emptyTitle: { fontFamily: fonts.aero, fontSize: 28, color: colors.smoke },
  emptyBody:  { fontFamily: fonts.display, fontSize: 14, color: colors.smoke },
});
