// mobile/app/(dashboard)/recipes/_layout.tsx
import { Stack } from "expo-router";
import { colors } from "@/components/ui/tokens";

export default function RecipesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.wall },
        animation: "slide_from_right",
      }}
    />
  );
}
