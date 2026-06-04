// mobile/app/index.tsx
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/components/ui/tokens";
import { HeroSection } from "@/components/landing/HeroSection";
import { KeywordsScroll } from "@/components/landing/KeywordsScroll";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";

export default function LandingScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HeroSection />
        <KeywordsScroll />
        <FeaturesGrid />
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.wall },
  scroll: { flex: 1 },
  content: { paddingBottom: 20, gap: 32 },
});
