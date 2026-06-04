// mobile/components/trends/EntityTable.tsx
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { colors, fonts } from "@/components/ui/tokens";
import type { EntityItem } from "@/lib/api";

const TYPE_COLOR: Record<string, string> = {
  restaurant:   colors.neon,
  chef:         colors.heat,
  neighborhood: colors.chalk,
};

export function EntityTable({ data }: { data: EntityItem[] }) {
  const sorted = [...data].sort((a, b) => b.mentions - a.mentions).slice(0, 15);

  if (!sorted.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>STREET MENTIONS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.header, { width: 24 }]}>#</Text>
            <Text style={[styles.cell, styles.header, { minWidth: 180 }]}>ENTITY</Text>
            <Text style={[styles.cell, styles.header, { width: 90 }]}>TYPE</Text>
            <Text style={[styles.cell, styles.header, { width: 60 }]}>MENTIONS</Text>
          </View>
          {sorted.map((item, i) => (
            <View key={item.name + i} style={[styles.row, i % 2 === 1 && styles.altRow]}>
              <Text style={[styles.cell, styles.rankCell, { width: 24 }]}>{i + 1}</Text>
              <Text style={[styles.cell, styles.nameCell, { minWidth: 180 }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={{ width: 90 }}>
                <Text
                  style={[
                    styles.typeBadge,
                    { color: TYPE_COLOR[item.type] ?? colors.smoke },
                  ]}
                >
                  {item.type.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.cell, styles.countCell, { width: 60 }]}>
                {item.mentions}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { margin: 16, backgroundColor: colors.poster, padding: 16 },
  heading: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.smoke,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.wire,
  },
  headerRow: { borderBottomWidth: 2, borderBottomColor: colors.slab },
  altRow: { backgroundColor: colors.concrete + "44" },
  cell: {
    fontFamily: fonts.bebas,
    fontSize: 12,
    color: colors.chalk,
    letterSpacing: 0.5,
  },
  header: { color: colors.smoke, fontSize: 12, letterSpacing: 1.5 },
  rankCell: { color: colors.smoke, textAlign: "center" },
  nameCell: { paddingLeft: 8, fontSize: 14 },
  countCell: { color: colors.neon, textAlign: "center" },
  typeBadge: {
    fontFamily: fonts.bebas,
    fontSize: 12,
    letterSpacing: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.wire,
    textAlign: "center",
  },
});
