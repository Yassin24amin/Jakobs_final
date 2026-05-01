import React, { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useResponsive } from "@/hooks/use-responsive";
import { DashboardColors } from "@/constants/dashboard-theme";

export default function PrepScreen() {
  const prepSheet = useQuery(api["im_forecast"].prepSheet.computePrepSheet, {
    dateTs: Date.now(),
  });
  const { isPhone } = useResponsive();

  if (prepSheet === undefined) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Computing prep sheet...</Text>
      </View>
    );
  }

  if (prepSheet === null) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>No data available — run the seed first</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {prepSheet.dayName}'s Prep
        </Text>
        <Text style={styles.headerSub}>
          {prepSheet.date} · {prepSheet.multiplier}x demand
        </Text>
      </View>

      {/* Shortfall alert */}
      {prepSheet.shortfallCount > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>
            {prepSheet.shortfallCount} ingredient
            {prepSheet.shortfallCount !== 1 ? "s" : ""} short for today's
            forecast
          </Text>
        </View>
      )}

      {/* Ingredient Needs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredient Needs</Text>
        <Text style={styles.sectionSub}>
          What you need vs what you have
        </Text>

        {!isPhone && (
          <View style={styles.tableHeader}>
            <Text style={[styles.thCell, { flex: 2.5 }]}>Ingredient</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Need</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Have</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Short</Text>
          </View>
        )}

        {prepSheet.ingredientReport.map((item) => (
          <View
            key={item.ingredientId}
            style={[
              styles.ingredientRow,
              item.isShort && styles.ingredientRowShort,
            ]}
          >
            {isPhone ? (
              // Phone: compact
              <>
                <View style={styles.ingredientLeft}>
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  <Text style={styles.ingredientDetail}>
                    Need {item.totalNeeded} {item.unit} · Have{" "}
                    {item.currentStock} {item.unit}
                  </Text>
                </View>
                {item.isShort && (
                  <View style={styles.shortBadge}>
                    <Text style={styles.shortBadgeText}>
                      -{item.shortfall}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              // Tablet: table
              <>
                <View style={[styles.tdCell, { flex: 2.5 }]}>
                  {item.isShort && (
                    <View style={styles.shortDot} />
                  )}
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  <Text style={styles.unitLabel}>{item.unit}</Text>
                </View>
                <Text style={[styles.tdText, { flex: 1 }]}>
                  {item.totalNeeded}
                </Text>
                <Text style={[styles.tdText, { flex: 1 }]}>
                  {item.currentStock}
                </Text>
                <Text
                  style={[
                    styles.tdText,
                    { flex: 1, fontWeight: "700" },
                    item.isShort && { color: DashboardColors.stock.critical },
                  ]}
                >
                  {item.isShort ? `-${item.shortfall}` : "OK"}
                </Text>
              </>
            )}
          </View>
        ))}
      </View>

      {/* Expected Product Demand */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expected Demand</Text>
        <Text style={styles.sectionSub}>
          Forecast for today (baseline × {prepSheet.multiplier})
        </Text>

        {prepSheet.productDemand.map((item) => (
          <View key={item.menuItemId} style={styles.demandRow}>
            <Text style={styles.demandName}>{item.name}</Text>
            <View style={styles.demandRight}>
              <Text style={styles.demandQty}>{item.expected}</Text>
              <Text style={styles.demandUnit}>units</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Prep Tasks */}
      {prepSheet.prepRecipes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prep Tasks</Text>
          {prepSheet.prepRecipes.map((recipe) => (
            <View key={recipe._id} style={styles.prepCard}>
              <View style={styles.prepHeader}>
                <Text style={styles.prepName}>{recipe.name}</Text>
                {recipe.restTimeHours > 0 && (
                  <View style={styles.restBadge}>
                    <Text style={styles.restBadgeText}>
                      {recipe.restTimeHours}h rest
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.prepDesc}>{recipe.description}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { paddingBottom: 40 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, color: "#9CA3AF" },
  // Header
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#11181C" },
  headerSub: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  // Alert
  alertBanner: {
    backgroundColor: "#FEF2F2",
    borderLeftWidth: 4,
    borderLeftColor: DashboardColors.stock.critical,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
  },
  alertText: { color: "#991B1B", fontSize: 14, fontWeight: "600" },
  // Sections
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#11181C",
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  sectionSub: {
    fontSize: 13,
    color: "#9CA3AF",
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  // Table header
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 8,
  },
  thCell: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  // Ingredient rows
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
    gap: 8,
  },
  ingredientRowShort: {
    backgroundColor: "#FEF2F2",
  },
  ingredientLeft: { flex: 1 },
  ingredientName: { fontSize: 14, fontWeight: "600", color: "#11181C" },
  ingredientDetail: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  shortBadge: {
    backgroundColor: DashboardColors.stock.critical,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  shortBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  shortDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DashboardColors.stock.critical,
  },
  unitLabel: { fontSize: 12, color: "#9CA3AF", marginLeft: 4 },
  tdCell: { flexDirection: "row", alignItems: "center", gap: 6 },
  tdText: { fontSize: 14, color: "#374151" },
  // Demand rows
  demandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  demandName: { fontSize: 14, fontWeight: "500", color: "#374151", flex: 1 },
  demandRight: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  demandQty: { fontSize: 18, fontWeight: "700", color: "#11181C" },
  demandUnit: { fontSize: 12, color: "#9CA3AF" },
  // Prep cards
  prepCard: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  prepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  prepName: { fontSize: 15, fontWeight: "600", color: "#11181C" },
  prepDesc: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  restBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  restBadgeText: { fontSize: 12, fontWeight: "600", color: "#3B82F6" },
});
