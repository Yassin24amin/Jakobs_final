import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Text,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';
import { InventoryStock } from '@/components/admin/inventory-stock';
import { InventoryPrep } from '@/components/admin/inventory-prep';
import { InventoryWaste } from '@/components/admin/inventory-waste';
import { InventoryConfig } from '@/components/admin/inventory-config';

type Segment = 'stock' | 'prep' | 'waste' | 'config';

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'stock', label: 'STOCK' },
  { key: 'prep', label: 'PREP' },
  { key: 'waste', label: 'WASTE' },
  { key: 'config', label: 'CONFIG' },
];

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const [activeSegment, setActiveSegment] = useState<Segment>('stock');
  const triggerScan = useMutation(api.im_reorder_scan.triggerScan);
  const scanRan = useRef(false);

  useEffect(() => {
    if (!scanRan.current) {
      scanRan.current = true;
      triggerScan().catch(() => {});
    }
  }, [triggerScan]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>INVENTORY</Text>
      </View>

      {/* Segment Pills */}
      <View style={styles.segmentWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segmentContainer}
        >
          {SEGMENTS.map((seg) => (
            <Pressable
              key={seg.key}
              style={[styles.segmentPill, activeSegment === seg.key && styles.segmentPillActive]}
              onPress={() => setActiveSegment(seg.key)}
            >
              <Text style={[styles.segmentText, activeSegment === seg.key && styles.segmentTextActive]}>
                {seg.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Active Sub-component */}
      <View style={styles.content}>
        {activeSegment === 'stock' && <InventoryStock />}
        {activeSegment === 'prep' && <InventoryPrep />}
        {activeSegment === 'waste' && <InventoryWaste />}
        {activeSegment === 'config' && <InventoryConfig />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  headerTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xl,
    color: Colors.primary,
    letterSpacing: 2,
    fontWeight: '700',
  },
  segmentWrapper: {
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  segmentContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  segmentPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    marginRight: Spacing.xs,
  },
  segmentPillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  segmentText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 1,
  },
  segmentTextActive: {
    color: Colors.black,
  },
  content: {
    flex: 1,
  },
});
