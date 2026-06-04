// mobile/app/(dashboard)/favorites.tsx
import { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { colors, fonts, shadows } from "@/components/ui/tokens";
import { FavoriteCard } from "@/components/favorites/FavoriteCard";
import { ExpiryBanner } from "@/components/favorites/ExpiryBanner";
import type { FavoriteItem } from "@/components/favorites/FavoriteCard";

const FAVORITES_KEY = "favorites_list";

async function loadFavorites(): Promise<FavoriteItem[]> {
  const raw = await SecureStore.getItemAsync(FAVORITES_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as FavoriteItem[];
}

async function removeFavorite(id: string): Promise<FavoriteItem[]> {
  const current = await loadFavorites();
  const updated = current.filter((f) => f.id !== id);
  await SecureStore.setItemAsync(FAVORITES_KEY, JSON.stringify(updated));
  return updated;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await loadFavorites();
    setFavorites(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (id: string) => {
    const updated = await removeFavorite(id);
    setFavorites(updated);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>YOUR COLLECTION</Text>
        <View style={styles.heroRow}>
          <Text style={styles.heading}>
            Saved <Text style={{ color: colors.neon }}>plates.</Text>
          </Text>
          <View>
            <Text style={styles.count}>{loading ? "—" : favorites.length}</Text>
            <Text style={styles.countLabel}>RECIPES KEPT</Text>
          </View>
        </View>
      </View>

      <ExpiryBanner favorites={favorites} />

      <FlatList
        style={{ flex: 1 }}
        data={favorites}
        keyExtractor={(f) => f.id}
        renderItem={({ item }) => (
          <FavoriteCard item={item} onRemove={handleRemove} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={colors.neon}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyHeart}>♡</Text>
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptyBody}>
                Tap the heart on any plate to keep it here.
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.push("/recipes")}
              >
                <Text style={styles.browseBtnText}>BROWSE RECIPES →</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
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
    gap: 12,
  },
  eyebrow: {
    fontFamily: fonts.bebas,
    fontSize: 9,
    letterSpacing: 3,
    color: colors.smoke,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  heading: {
    fontFamily: fonts.aero,
    fontSize: 40,
    color: colors.chalk,
    lineHeight: 42,
  },
  count: {
    fontFamily: fonts.bebas,
    fontSize: 56,
    color: colors.neon,
    lineHeight: 56,
    textAlign: "right",
  },
  countLabel: {
    fontFamily: fonts.bebas,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.smoke,
    textAlign: "right",
  },
  list: { paddingVertical: 12, paddingBottom: 80 },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyHeart: {
    fontFamily: fonts.bebas,
    fontSize: 48,
    color: colors.smoke,
  },
  emptyTitle: {
    fontFamily: fonts.aero,
    fontSize: 28,
    color: colors.chalk,
  },
  emptyBody: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.smoke,
    textAlign: "center",
  },
  browseBtn: {
    backgroundColor: colors.heat,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
    ...shadows.tag,
  },
  browseBtnText: {
    fontFamily: fonts.bebas,
    fontSize: 13,
    letterSpacing: 3,
    color: colors.chalk,
  },
});
