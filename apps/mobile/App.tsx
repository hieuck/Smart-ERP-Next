import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import { initI18n } from "@smart-erp/i18n";
import { SyncService } from "@smart-erp/sync";
import { SecureStoreTokenProvider } from "./src/lib/secureStoreTokenProvider";
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import ProductsScreen from "./src/screens/ProductsScreen";
import OrdersScreen from "./src/screens/OrdersScreen";
import CustomersScreen from "./src/screens/CustomersScreen";
import InventoryScreen from "./src/screens/InventoryScreen";
import LeadsScreen from "./src/screens/LeadsScreen";

initI18n("vi");

const mobileSyncService = new SyncService(
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  new SecureStoreTokenProvider(),
);

type Screen = "dashboard" | "products" | "orders" | "customers" | "inventory" | "leads";

const NAV_ITEMS: { key: Screen; label: string; icon: string }[] = [
  { key: "dashboard", label: "Tổng quan", icon: "📊" },
  { key: "products", label: "Sản phẩm", icon: "📦" },
  { key: "orders", label: "Đơn hàng", icon: "🛒" },
  { key: "customers", label: "Khách hàng", icon: "👥" },
  { key: "inventory", label: "Kho hàng", icon: "🏭" },
  { key: "leads", label: "Leads", icon: "🎯" },
];

export default function App() {
  const [authState, setAuthState] = useState<
    "loading" | "unauthenticated" | "authenticated"
  >("loading");
  const [user, setUser] = useState<any>(null);
  const [activeScreen, setActiveScreen] = useState<Screen>("dashboard");
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check stored credentials on startup
    SecureStore.getItemAsync("access_token").then((token) => {
      if (token) {
        SecureStore.getItemAsync("user").then((userStr) => {
          if (userStr) {
            setUser(JSON.parse(userStr));
            setAuthState("authenticated");
            mobileSyncService.processQueue().catch(console.error);
          } else {
            setAuthState("unauthenticated");
          }
        });
      } else {
        setAuthState("unauthenticated");
      }
    });
  }, []);

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
    setAuthState("authenticated");
    mobileSyncService.processQueue().catch(console.error);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("user");
    await SecureStore.deleteItemAsync("tenant_id");
    setUser(null);
    setAuthState("unauthenticated");
  };

  if (authState === "loading") {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>ERP</Text>
        </View>
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 24 }} />
        <Text style={styles.loadingText}>Smart ERP Next</Text>
      </View>
    );
  }

  if (authState === "unauthenticated") {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case "dashboard":
        return <DashboardScreen user={user} />;
      case "products":
        return <ProductsScreen />;
      case "orders":
        return <OrdersScreen />;
      case "customers":
        return <CustomersScreen />;
      case "inventory":
        return <InventoryScreen />;
      case "leads":
        return <LeadsScreen />;
      case "leads":
        return <LeadsScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="dark" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Smart ERP</Text>
          <Text style={styles.headerSubtitle}>
            {NAV_ITEMS.find((n) => n.key === activeScreen)?.label}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.onlineBadge,
              { backgroundColor: isOnline ? "#dcfce7" : "#fef9c3" },
            ]}
          >
            <Text
              style={[
                styles.onlineText,
                { color: isOnline ? "#16a34a" : "#ca8a04" },
              ]}
            >
              {isOnline ? "● Online" : "○ Offline"}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>↩</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>{renderScreen()}</View>

      <View style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.navItem}
            onPress={() => setActiveScreen(item.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text
              style={[
                styles.navLabel,
                activeScreen === item.key && styles.navLabelActive,
              ]}
            >
              {item.label}
            </Text>
            {activeScreen === item.key && <View style={styles.navIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#f0f4ff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoBox: {
    width: 72,
    height: 72,
    backgroundColor: "#3b82f6",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  headerSubtitle: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  onlineBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  onlineText: { fontSize: 12, fontWeight: "600" },
  logoutBtn: { padding: 6 },
  logoutText: { fontSize: 18, color: "#6b7280" },
  content: { flex: 1 },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
    position: "relative",
  },
  navIcon: { fontSize: 22, marginBottom: 3 },
  navLabel: { fontSize: 10, color: "#9ca3af", fontWeight: "500" },
  navLabelActive: { color: "#3b82f6", fontWeight: "700" },
  navIndicator: {
    position: "absolute",
    top: 0,
    left: "25%",
    right: "25%",
    height: 3,
    backgroundColor: "#3b82f6",
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
});
