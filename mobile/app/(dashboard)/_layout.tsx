// mobile/app/(dashboard)/_layout.tsx
import { Tabs, useRouter } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "@/components/ui/tokens";

function TabIcon({ name, label, active }: { name: React.ComponentProps<typeof Ionicons>["name"]; label: string; active: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Ionicons name={name} size={20} color={active ? colors.neon : colors.smoke} />
      <Text style={[styles.tabLabel, { color: active ? colors.neon : colors.smoke }]}>
        {label}
      </Text>
    </View>
  );
}

function HeaderRight() {
  const router = useRouter();
  const signOut = async () => {
    await SecureStore.deleteItemAsync("google_access_token");
    await SecureStore.deleteItemAsync("google_user");
    router.replace("/");
  };
  return (
    <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
      <Ionicons name="log-out-outline" size={18} color={colors.smoke} />
      <Text style={styles.signOutText}>EXIT</Text>
    </TouchableOpacity>
  );
}

export default function DashboardLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.wall },
        headerTintColor: colors.chalk,
        headerTitleStyle: { fontFamily: fonts.bebas, letterSpacing: 2, fontSize: 13 },
        headerShadowVisible: false,
        headerRight: () => <HeaderRight />,
        tabBarStyle: {
          backgroundColor: colors.wall,
          borderTopColor: colors.wire,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="trends"
        options={{
          headerTitle: "EMPIRE'S TASTE",
          tabBarIcon: ({ focused }) => <TabIcon name="trending-up-outline" label="TRENDS" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          headerTitle: "ON THE MENU",
          tabBarIcon: ({ focused }) => <TabIcon name="restaurant-outline" label="RECIPES" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          headerTitle: "SAVED PLATES",
          tabBarIcon: ({ focused }) => <TabIcon name="bookmark-outline" label="SAVED" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="data"
        options={{
          headerTitle: "THE LINE",
          tabBarIcon: ({ focused }) => <TabIcon name="bar-chart-outline" label="DATA" active={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: { alignItems: "center", gap: 2 },
  tabLabel: { fontFamily: fonts.bebas, fontSize: 9, letterSpacing: 1.5 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.wire,
  },
  signOutText: {
    fontFamily: fonts.bebas,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.smoke,
  },
});
