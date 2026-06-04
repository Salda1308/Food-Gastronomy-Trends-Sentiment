// mobile/components/favorites/ExpiryBanner.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "@/components/ui/tokens";
import type { FavoriteItem } from "./FavoriteCard";

const DAYS_WARNING = 3;

function daysOld(savedAt: string): number {
  const ms = Date.now() - new Date(savedAt).getTime();
  return Math.floor(ms / 86_400_000);
}

export function ExpiryBanner({ favorites }: { favorites: FavoriteItem[] }) {
  const stale = favorites.filter((f) => daysOld(f.savedAt) >= DAYS_WARNING);
  if (!stale.length) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        ⚠ {stale.length} saved plate{stale.length > 1 ? "s" : ""} saved{" "}
        {DAYS_WARNING}+ days ago — check for freshness.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.heat + "22",
    borderTopWidth: 3,
    borderTopColor: colors.heat,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  text: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.heat,
    lineHeight: 18,
  },
});
