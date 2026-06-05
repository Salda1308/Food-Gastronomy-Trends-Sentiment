// mobile/app/(dashboard)/recipes/index.tsx
import { useState, useCallback, useEffect } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { useApi } from "@/hooks/useApi";
import { getRecipes } from "@/lib/api";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { FilterSheet } from "@/components/recipes/FilterSheet";
import { colors, fonts } from "@/components/ui/tokens";
import type { RecipeItem, RecipeParams } from "@/lib/api";
import type { FavoriteItem } from "@/components/favorites/FavoriteCard";

const SAVED_KEY     = "saved_recipe_ids";
const FAVORITES_KEY = "favorites_list";

async function loadSavedIds(): Promise<Set<number>> {
  const raw = await SecureStore.getItemAsync(SAVED_KEY);
  if (!raw) return new Set();
  return new Set(JSON.parse(raw) as number[]);
}

async function toggleSave(recipe: RecipeItem): Promise<Set<number>> {
  // 1. Update the quick-lookup ID set
  const saved = await loadSavedIds();
  const adding = !saved.has(recipe.id);
  if (adding) saved.add(recipe.id);
  else saved.delete(recipe.id);
  await SecureStore.setItemAsync(SAVED_KEY, JSON.stringify([...saved]));

  // 2. Keep favorites_list in sync with full recipe data
  const rawFavs = await SecureStore.getItemAsync(FAVORITES_KEY);
  const favs: FavoriteItem[] = rawFavs ? JSON.parse(rawFavs) : [];
  if (adding) {
    favs.push({
      id:          String(recipe.id),
      recipeId:    recipe.id,
      recipeTitle: recipe.title,
      recipeImage: recipe.image ?? null,
      savedAt:     new Date().toISOString(),
    });
  } else {
    const idx = favs.findIndex((f) => f.recipeId === recipe.id);
    if (idx !== -1) favs.splice(idx, 1);
  }
  await SecureStore.setItemAsync(FAVORITES_KEY, JSON.stringify(favs));

  return saved;
}

export default function RecipesScreen() {
  const [filters, setFilters] = useState<RecipeParams>({});
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  const { data: recipes, loading, error, refetch } = useApi(() => getRecipes(filters));

  useEffect(() => {
    loadSavedIds().then(setSavedIds);
  }, []);

  const handleFiltersChange = useCallback(
    (f: RecipeParams) => {
      setFilters(f);
      refetch();
    },
    [refetch]
  );

  const handleSave = useCallback(async (recipe: RecipeItem) => {
    const next = await toggleSave(recipe);
    setSavedIds(new Set(next));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>WHAT'S WORTH COOKING</Text>
          <Text style={styles.heading}>ON THE MENU</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.neon} />
        ) : error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>CAN'T REACH API</Text>
            <Text style={styles.emptyBody}>{error}</Text>
            <Text style={[styles.emptyBody, { marginTop: 8, color: colors.smoke }]}>
              {`API: ${process.env.EXPO_PUBLIC_API_URL ?? "(no URL set)"}`}
            </Text>
          </View>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={recipes ?? []}
            keyExtractor={(r) => String(r.id)}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.cardWrap}>
                <RecipeCard
                  recipe={item}
                  isSaved={savedIds.has(item.id)}
                  onSave={handleSave}
                />
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>NOTHING HERE</Text>
                <Text style={styles.emptyBody}>
                  No recipes match your filters.
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={refetch}
                tintColor={colors.neon}
              />
            }
          />
        )}

        <FilterSheet filters={filters} onChange={handleFiltersChange} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.wall },
  header: { padding: 20, paddingBottom: 8 },
  eyebrow: {
    fontFamily: fonts.bebas,
    fontSize: 9,
    letterSpacing: 3,
    color: colors.smoke,
  },
  heading: {
    fontFamily: fonts.aero,
    fontSize: 40,
    color: colors.chalk,
    lineHeight: 42,
  },
  list: { padding: 12, paddingBottom: 140 },
  row: { gap: 10, marginBottom: 10 },
  cardWrap: { flex: 1 },
  empty: { alignItems: "center", padding: 40 },
  emptyTitle: {
    fontFamily: fonts.aero,
    fontSize: 32,
    color: colors.smoke,
    letterSpacing: 2,
  },
  emptyBody: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.smoke,
    marginTop: 8,
  },
});
