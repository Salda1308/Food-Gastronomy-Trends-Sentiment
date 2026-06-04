// mobile/components/data/KpiCard.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, shadows } from "@/components/ui/tokens";

interface KpiCardProps {
  label:    string;
  sublabel: string;
  value:    string;
  bad?:     boolean;
}

export function KpiCard({ label, sublabel, value, bad = false }: KpiCardProps) {
  const valueColor = bad ? colors.heat : colors.neon;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={styles.sublabel}>{sublabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.poster,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.wire,
    borderTopWidth: 3,
    borderTopColor: colors.neon,
    ...shadows.tag,
  },
  label: {
    fontFamily: fonts.bebas,
    fontSize: 14,
    letterSpacing: 1.5,
    color: colors.chalk,
    marginBottom: 6,
  },
  value: {
    fontFamily: fonts.bebas,
    fontSize: 30,
    lineHeight: 30,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  sublabel: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.smoke,
    lineHeight: 16,
  },
});
