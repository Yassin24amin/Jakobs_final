import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

export function InventoryPrep() {
  const prepSheet = useQuery(api["im_forecast"].prepSheet.computePrepSheet, {
    dateTs: Date.now(),
  });

  if (prepSheet === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <Text style={styles.loadingText}>COMPUTING PREP SHEET...</Text>
      </View>
    );
  }

  if (prepSheet === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>NO DATA AVAILABLE</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <Text style={styles.dayName}>{prepSheet.dayName.toUpperCase()}'S PREP</Text>
        <Text style={styles.dateLine}>
          {prepSheet.date} {'\u00B7'} {prepSheet.multiplier}x DEMAND
        </Text>
      </View>

      {/* Shortfall Banner */}
      {prepSheet.shortfallCount > 0 && (
        <View style={styles.shortfallBanner}>
          <Text style={styles.shortfallText}>
            {prepSheet.shortfallCount} INGREDIENT{prepSheet.shortfallCount !== 1 ? 'S' : ''} SHORT FOR TODAY
          </Text>
        </View>
      )}

      {/* Ingredient Needs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INGREDIENT NEEDS</Text>
        <View style={styles.sectionDivider} />

        {prepSheet.ingredientReport.map((item) => (
          <View
            key={item.ingredientId}
            style={[
              styles.ingredientRow,
              item.isShort && styles.ingredientRowShort,
            ]}
          >
            <View style={styles.ingredientInfo}>
              <Text style={styles.ingredientName}>{item.name}</Text>
              <Text style={styles.ingredientUnit}>{item.unit}</Text>
            </View>
            <View style={styles.ingredientNumbers}>
              <Text style={styles.needLabel}>
                NEED <Text style={styles.needValue}>{item.totalNeeded}</Text>
              </Text>
              <Text style={styles.haveLabel}>
                HAVE <Text style={styles.haveValue}>{item.currentStock}</Text>
              </Text>
              {item.isShort && (
                <View style={styles.shortBadge}>
                  <Text style={styles.shortBadgeText}>-{item.shortfall}</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Expected Demand */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EXPECTED DEMAND</Text>
        <Text style={styles.sectionSubtitle}>
          BASELINE {'\u00D7'} {prepSheet.multiplier}
        </Text>
        <View style={styles.sectionDivider} />

        {prepSheet.productDemand.map((item) => (
          <View key={item.menuItemId} style={styles.demandRow}>
            <Text style={styles.demandName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.demandRight}>
              <Text style={styles.demandQty}>{item.expected}</Text>
              <Text style={styles.demandUnit}>UNITS</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Prep Tasks */}
      {prepSheet.prepRecipes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREP TASKS</Text>
          <View style={styles.sectionDivider} />

          {prepSheet.prepRecipes.map((recipe) => (
            <View key={recipe._id} style={styles.prepCard}>
              <View style={styles.prepHeader}>
                <Text style={styles.prepName}>{recipe.name}</Text>
                {recipe.restTimeHours > 0 && (
                  <View style={styles.restBadge}>
                    <Text style={styles.restBadgeText}>
                      {recipe.restTimeHours}H REST
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.faint,
    letterSpacing: 1,
  },
  // Header
  headerCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    padding: Spacing.md,
  },
  dayName: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 2,
  },
  dateLine: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 1,
    marginTop: 4,
  },
  // Shortfall
  shortfallBanner: {
    backgroundColor: Colors.stockCritical,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  shortfallText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.black,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Sections
  section: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    fontWeight: '700',
    letterSpacing: 2,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  sectionSubtitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.rule,
    marginTop: Spacing.sm,
  },
  // Ingredient Rows
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.rule,
  },
  ingredientRowShort: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.stockCritical,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  ingredientUnit: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
  },
  ingredientNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  needLabel: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
  },
  needValue: {
    color: Colors.primary,
    fontWeight: '700',
  },
  haveLabel: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
  },
  haveValue: {
    color: Colors.primary,
    fontWeight: '700',
  },
  shortBadge: {
    backgroundColor: Colors.stockCritical,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  shortBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.black,
    fontWeight: '700',
  },
  // Demand Rows
  demandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.rule,
  },
  demandName: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    flex: 1,
  },
  demandRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  demandQty: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    color: Colors.accent,
    fontWeight: '700',
  },
  demandUnit: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
  },
  // Prep Cards
  prepCard: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.rule,
  },
  prepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prepName: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '700',
  },
  prepDesc: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    marginTop: 4,
  },
  restBadge: {
    backgroundColor: Colors.statusConfirmed,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  restBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.black,
    fontWeight: '700',
  },
});
