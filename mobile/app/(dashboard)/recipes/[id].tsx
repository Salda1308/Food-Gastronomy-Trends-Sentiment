// mobile/app/(dashboard)/recipes/[id].tsx
import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRef, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApi } from "@/hooks/useApi";
import { getRecipeById } from "@/lib/api";
import { colors, fonts, shadows } from "@/components/ui/tokens";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const numericId = id ? Number(id) : null;
  const { data: recipe, loading, error, refetch } = useApi(() =>
    numericId != null ? getRecipeById(numericId) : Promise.reject(new Error("No ID"))
  );

  // Re-fetch when id resolves (guards against undefined on first render)
  const prevId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (id && id !== prevId.current) {
      prevId.current = id;
      refetch();
    }
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.neon} />
      </SafeAreaView>
    );
  }

  if (error || !recipe) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>RECIPE NOT FOUND</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const imgSrc =
    recipe.image ?? `https://picsum.photos/seed/food-${recipe.id}/800/400`;
  const ingredients = recipe.ingredient_names
    ? recipe.ingredient_names
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const badges = [
    recipe.vegetarian && "VEGETARIAN",
    recipe.vegan && "VEGAN",
    recipe.glutenFree && "GLUTEN FREE",
    recipe.dairyFree && "DAIRY FREE",
  ].filter(Boolean) as string[];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={styles.imgWrap}>
          <Image source={{ uri: imgSrc }} style={styles.img} />
          <View style={styles.imgOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← BACK</Text>
          </TouchableOpacity>
          <View style={styles.imgBottom}>
            <View style={styles.healthChip}>
              <Text style={styles.healthChipText}>★ {recipe.healthScore}</Text>
            </View>
            <Text style={styles.imgTitle}>{recipe.title}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Meta row */}
          <View style={styles.metaRow}>
            {[
              { label: "TIME",     value: `${recipe.readyInMinutes}min` },
              { label: "SERVINGS", value: String(recipe.servings ?? "—") },
              { label: "HEALTH",   value: `${recipe.healthScore}/100` },
              { label: "SCORE",    value: String(recipe.spoonacularScore ?? "—") },
            ].map((m) => (
              <View key={m.label} style={styles.metaBox}>
                <Text style={styles.metaLabel}>{m.label}</Text>
                <Text style={styles.metaValue}>{m.value}</Text>
              </View>
            ))}
          </View>

          {/* Diet badges */}
          {badges.length > 0 && (
            <View style={styles.badgeRow}>
              {badges.map((b) => (
                <View key={b} style={styles.badge}>
                  <Text style={styles.badgeText}>{b}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Ingredients */}
          {ingredients.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>INGREDIENTS</Text>
              {ingredients.map((ing) => (
                <View key={ing} style={styles.ingredient}>
                  <Text style={styles.ingDash}>—</Text>
                  <Text style={styles.ingText}>{ing}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Instructions */}
          {recipe.instructions_text && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>INSTRUCTIONS</Text>
              <Text style={styles.instructions}>{recipe.instructions_text}</Text>
            </View>
          )}

          {/* Source link */}
          {recipe.sourceUrl && (
            <TouchableOpacity
              style={styles.sourceBtn}
              onPress={() => Linking.openURL(recipe.sourceUrl!)}
            >
              <Text style={styles.sourceBtnText}>VIEW ORIGINAL RECIPE →</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.wall },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  errorTitle: {
    fontFamily: fonts.aero,
    fontSize: 28,
    color: colors.smoke,
  },
  backLink: {
    fontFamily: fonts.bebas,
    fontSize: 14,
    color: colors.neon,
    letterSpacing: 2,
  },
  imgWrap: { height: 280, position: "relative" },
  img: { width: "100%", height: "100%", resizeMode: "cover" },
  imgOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: colors.concrete + "cc",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backBtnText: {
    fontFamily: fonts.bebas,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.chalk,
  },
  imgBottom: { position: "absolute", bottom: 16, left: 16, right: 16, gap: 6 },
  healthChip: {
    backgroundColor: colors.neon,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  healthChipText: {
    fontFamily: fonts.bebas,
    fontSize: 10,
    color: colors.poster,
  },
  imgTitle: {
    fontFamily: fonts.aero,
    fontSize: 28,
    color: colors.chalk,
    lineHeight: 30,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 0,
  },
  body: { padding: 20, gap: 16 },
  metaRow: { flexDirection: "row", gap: 8 },
  metaBox: {
    flex: 1,
    backgroundColor: colors.poster,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.wire,
    ...shadows.tag,
  },
  metaLabel: {
    fontFamily: fonts.bebas,
    fontSize: 8,
    letterSpacing: 2,
    color: colors.smoke,
    marginBottom: 4,
  },
  metaValue: {
    fontFamily: fonts.bebas,
    fontSize: 20,
    color: colors.neon,
    lineHeight: 22,
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: {
    borderWidth: 1,
    borderColor: colors.wire,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: fonts.bebas,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.smoke,
  },
  section: { gap: 8 },
  sectionTitle: {
    fontFamily: fonts.bebas,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.smoke,
    borderBottomWidth: 1,
    borderBottomColor: colors.wire,
    paddingBottom: 6,
  },
  ingredient: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  ingDash: {
    fontFamily: fonts.bebas,
    fontSize: 13,
    color: colors.smoke,
    marginTop: 1,
  },
  ingText: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.chalk,
    flex: 1,
    lineHeight: 20,
  },
  instructions: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.chalk,
    lineHeight: 22,
  },
  sourceBtn: {
    borderWidth: 1,
    borderColor: colors.neon,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  sourceBtnText: {
    fontFamily: fonts.bebas,
    fontSize: 13,
    letterSpacing: 3,
    color: colors.neon,
  },
});
