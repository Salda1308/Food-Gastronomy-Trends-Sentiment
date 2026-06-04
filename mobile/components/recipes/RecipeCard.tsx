// mobile/components/recipes/RecipeCard.tsx
import { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts, shadows } from "@/components/ui/tokens";
import type { RecipeItem } from "@/lib/api";

interface RecipeCardProps {
  recipe: RecipeItem;
  isSaved: boolean;
  onSave: (recipe: RecipeItem) => void;
}

export function RecipeCard({ recipe, isSaved, onSave }: RecipeCardProps) {
  const router = useRouter();
  const [pulse, setPulse] = useState(false);

  const health = recipe.healthScore ?? 0;
  const badgeTone =
    health >= 80 ? "positive" : health >= 60 ? "neutral" : "negative";
  const badgeColor =
    badgeTone === "positive"
      ? colors.chalk
      : badgeTone === "negative"
      ? colors.heat
      : colors.smoke;

  const imgSrc =
    recipe.image ?? `https://picsum.photos/seed/food-${recipe.id}/400/280`;

  const handleSave = () => {
    if (isSaved) return;
    setPulse(true);
    setTimeout(() => setPulse(false), 320);
    onSave(recipe);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => router.push(`/recipes/${recipe.id}`)}
    >
      <View style={styles.imgWrap}>
        <Image source={{ uri: imgSrc }} style={styles.img} />
        <View style={styles.imgOverlay} />

        <View style={styles.healthBadge}>
          <Text style={styles.healthText}>★ {health}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            isSaved && styles.saveBtnActive,
            pulse && { transform: [{ scale: 1.3 }] },
          ]}
          onPress={handleSave}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ color: isSaved ? colors.poster : colors.smoke, fontSize: 14 }}>
            {isSaved ? "♥" : "♡"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.imgTitle} numberOfLines={2}>
          {recipe.title}
        </Text>
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaText}>
          {recipe.readyInMinutes} min · {recipe.cuisines || "intl"}
        </Text>
        <View
          style={[
            styles.metaBadge,
            {
              borderColor: badgeColor + "66",
              backgroundColor: badgeColor + "22",
            },
          ]}
        >
          <Text style={[styles.metaBadgeText, { color: badgeColor }]}>
            {badgeTone === "positive"
              ? "aligned"
              : badgeTone === "negative"
              ? "fading"
              : "steady"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.poster,
    overflow: "hidden",
    ...shadows.poster,
  },
  imgWrap: { position: "relative", height: 160 },
  img: { width: "100%", height: "100%", resizeMode: "cover" },
  imgOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  healthBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.neon,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  healthText: {
    fontFamily: fonts.bebas,
    fontSize: 13,
    color: colors.poster,
    letterSpacing: 0.5,
  },
  saveBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    backgroundColor: colors.concrete,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnActive: { backgroundColor: colors.neon },
  imgTitle: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    fontFamily: fonts.aero,
    fontSize: 20,
    color: colors.chalk,
    lineHeight: 22,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 0,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.wire,
  },
  metaText: {
    fontFamily: fonts.bebas,
    fontSize: 14,
    color: colors.smoke,
    letterSpacing: 0.5,
  },
  metaBadge: { borderWidth: 1, paddingHorizontal: 9, paddingVertical: 3 },
  metaBadgeText: { fontFamily: fonts.bebas, fontSize: 13, letterSpacing: 1.5 },
});
