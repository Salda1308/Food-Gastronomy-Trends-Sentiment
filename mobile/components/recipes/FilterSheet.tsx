// mobile/components/recipes/FilterSheet.tsx
import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  Pressable,
} from "react-native";
import { colors, fonts } from "@/components/ui/tokens";
import type { RecipeParams } from "@/lib/api";

interface FilterSheetProps {
  filters: RecipeParams;
  onChange: (filters: RecipeParams) => void;
}

const CUISINES = ["", "Italian", "Mexican", "Japanese", "American", "Chinese", "Thai", "Indian"];
const DIETS    = ["", "vegetarian", "vegan", "gluten free", "dairy free", "paleo", "ketogenic"];
const TIMES    = [undefined, 15, 30, 45, 60, 90] as (number | undefined)[];

export function FilterSheet({ filters, onChange }: FilterSheetProps) {
  const [open, setOpen] = useState(false);

  const update = (key: keyof RecipeParams, val: string | number | undefined) =>
    onChange({ ...filters, [key]: val || undefined });

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <>
      {/* Handle bar — always visible at bottom */}
      <TouchableOpacity style={styles.handle} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <View style={styles.pill} />
        <Text style={styles.handleLabel}>
          FILTER RECIPES{activeCount > 0 ? `  ·  ${activeCount} ACTIVE` : ""}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>FILTER RECIPES</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>CUISINE</Text>
            <View style={styles.chipRow}>
              {CUISINES.map((c) => (
                <TouchableOpacity
                  key={c || "all-cuisine"}
                  style={[styles.chip, filters.cuisine === (c || undefined) && styles.chipActive]}
                  onPress={() => update("cuisine", c)}
                >
                  <Text style={[styles.chipText, filters.cuisine === (c || undefined) && styles.chipTextActive]}>
                    {c || "ALL"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>DIET</Text>
            <View style={styles.chipRow}>
              {DIETS.map((d) => (
                <TouchableOpacity
                  key={d || "all-diet"}
                  style={[styles.chip, filters.diet === (d || undefined) && styles.chipActive]}
                  onPress={() => update("diet", d)}
                >
                  <Text style={[styles.chipText, filters.diet === (d || undefined) && styles.chipTextActive]}>
                    {d || "ALL"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>MAX TIME</Text>
            <View style={styles.chipRow}>
              {TIMES.map((t) => (
                <TouchableOpacity
                  key={t ?? "any"}
                  style={[styles.chip, filters.maxReadyTime === t && styles.chipActive]}
                  onPress={() => update("maxReadyTime", t)}
                >
                  <Text style={[styles.chipText, filters.maxReadyTime === t && styles.chipTextActive]}>
                    {t ? `${t}min` : "ANY"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>SEARCH</Text>
            <TextInput
              style={styles.input}
              value={filters.query ?? ""}
              onChangeText={(v) => update("query", v)}
              placeholder="e.g. ramen, tacos…"
              placeholderTextColor={colors.smoke}
              returnKeyType="search"
            />

            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => { onChange({}); setOpen(false); }}
            >
              <Text style={styles.clearText}>CLEAR FILTERS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => setOpen(false)}
            >
              <Text style={styles.applyText}>APPLY →</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  handle: {
    backgroundColor: colors.slab,
    borderTopWidth: 1,
    borderTopColor: colors.wire,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 6,
  },
  pill: {
    width: 36,
    height: 4,
    backgroundColor: colors.smoke,
    borderRadius: 2,
  },
  handleLabel: {
    fontFamily: fonts.bebas,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.smoke,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: colors.slab,
    borderTopWidth: 1,
    borderTopColor: colors.wire,
    maxHeight: "70%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.wire,
  },
  title: {
    fontFamily: fonts.bebas,
    fontSize: 16,
    letterSpacing: 3,
    color: colors.chalk,
  },
  closeBtn: {
    fontFamily: fonts.bebas,
    fontSize: 16,
    color: colors.smoke,
    paddingHorizontal: 8,
  },
  content: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12 },
  sectionLabel: {
    fontFamily: fonts.bebas,
    fontSize: 9,
    letterSpacing: 3,
    color: colors.smoke,
    marginBottom: 8,
    marginTop: 16,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: colors.wire,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.concrete,
  },
  chipActive: { backgroundColor: colors.neon, borderColor: colors.neon },
  chipText: {
    fontFamily: fonts.bebas,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.smoke,
  },
  chipTextActive: { color: colors.poster },
  input: {
    borderWidth: 1,
    borderColor: colors.wire,
    backgroundColor: colors.concrete,
    color: colors.chalk,
    fontFamily: fonts.display,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearBtn: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.heat,
    paddingVertical: 12,
    alignItems: "center",
  },
  clearText: {
    fontFamily: fonts.bebas,
    fontSize: 13,
    letterSpacing: 3,
    color: colors.heat,
  },
  applyBtn: {
    marginTop: 8,
    backgroundColor: colors.neon,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyText: {
    fontFamily: fonts.bebas,
    fontSize: 14,
    letterSpacing: 3,
    color: colors.poster,
  },
});
