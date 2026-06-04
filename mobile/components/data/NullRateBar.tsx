// mobile/components/data/NullRateBar.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "@/components/ui/tokens";
import type { NullRateItem } from "@/lib/api";

const FIELD_LABELS: Record<string, string> = {
  "api/preparationMinutes": "Recipe prep time",
  "api/cookingMinutes":     "Recipe cooking time",
  "api/occasions":          "Occasion tags",
  "api/cuisines":           "Cuisine type",
  "api/license":            "Recipe license",
  "api/diets":              "Dietary labels",
  "api/dishTypes":          "Dish category",
  "api/pricePerServing":    "Price per serving",
  "api/healthScore":        "Health score",
  "api/summary":            "Recipe description",
  "webscraping/article_summary":  "Article content",
  "webscraping/article_title":    "Article headline",
  "webscraping/author":           "Article author",
  "webscraping/published_date":   "Publication date",
};

function friendlyField(raw: string): string {
  return FIELD_LABELS[raw] ?? raw.replace(/^(api|webscraping)\//, "");
}

function healthConfig(rate: number): { bar: string; label: string; labelColor: string } {
  if (rate > 50) return { bar: colors.heat, label: "High concern", labelColor: colors.heat };
  if (rate > 20) return { bar: "#e67e22",   label: "Review",       labelColor: "#e67e22" };
  if (rate > 5)  return { bar: colors.neon, label: "Acceptable",   labelColor: colors.neon };
  return               { bar: colors.neon, label: "Healthy",      labelColor: colors.chalk };
}

export function NullRateBar({ data }: { data: NullRateItem[] }) {
  const sorted = [...data].sort((a, b) => b.null_rate - a.null_rate);

  return (
    <View style={styles.container}>
      {sorted.map((item) => {
        const { bar, label, labelColor } = healthConfig(item.null_rate);
        const pct = Math.min(Math.round(item.null_rate), 100);
        return (
          <View key={item.field} style={styles.card}>
            <Text style={styles.fieldName} numberOfLines={1}>
              {friendlyField(item.field)}
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: bar }]} />
            </View>
            <View style={styles.footer}>
              <Text style={[styles.pct, { color: bar }]}>{pct}%</Text>
              <Text style={[styles.healthLabel, { color: labelColor, borderColor: labelColor + "44", backgroundColor: bar + "18" }]}>
                {label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  card: {
    backgroundColor: colors.concrete,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.wire,
    gap: 8,
  },
  fieldName: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.chalk,
    lineHeight: 18,
  },
  track: { height: 6, backgroundColor: colors.slab, borderRadius: 1 },
  fill:  { height: "100%", minWidth: 2, borderRadius: 1 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pct: {
    fontFamily: fonts.bebas,
    fontSize: 20,
    letterSpacing: 0.5,
  },
  healthLabel: {
    fontFamily: fonts.bebas,
    fontSize: 12,
    letterSpacing: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
});
