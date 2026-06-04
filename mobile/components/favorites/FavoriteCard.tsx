// mobile/components/favorites/FavoriteCard.tsx
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts, shadows } from "@/components/ui/tokens";

export interface FavoriteItem {
  id: string;
  recipeId: number;
  recipeTitle: string;
  recipeImage?: string | null;
  savedAt: string;
}

interface FavoriteCardProps {
  item: FavoriteItem;
  onRemove: (id: string) => void;
}

export function FavoriteCard({ item, onRemove }: FavoriteCardProps) {
  const router = useRouter();
  const imgSrc =
    item.recipeImage ?? `https://picsum.photos/seed/food-${item.recipeId}/400/280`;

  const savedDate = new Date(item.savedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => router.push(`/recipes/${item.recipeId}`)}
    >
      <Image source={{ uri: imgSrc }} style={styles.img} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {item.recipeTitle}
        </Text>
        <Text style={styles.date}>Saved {savedDate}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => onRemove(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.removeText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.poster,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 4,
    overflow: "hidden",
    ...shadows.poster,
  },
  img: { width: 80, height: 80, resizeMode: "cover" },
  info: { flex: 1, padding: 12, gap: 4 },
  title: {
    fontFamily: fonts.aero,
    fontSize: 16,
    color: colors.chalk,
    lineHeight: 18,
  },
  date: {
    fontFamily: fonts.bebas,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.smoke,
  },
  removeBtn: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    fontFamily: fonts.bebas,
    fontSize: 14,
    color: colors.heat,
  },
});
