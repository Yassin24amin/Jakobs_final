import React from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ZineText } from '@/components/zine-text';
import { Rule } from '@/components/rule';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.statusPending,
  confirmed: Colors.statusConfirmed,
  preparing: Colors.statusPreparing,
  ready: Colors.statusReady,
  completed: Colors.statusCompleted,
  cancelled: Colors.statusCancelled,
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'ORDER RECEIVED',
  confirmed: 'CONFIRMED',
  preparing: 'BEING PREPARED',
  ready: 'READY FOR PICKUP',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

export default function OrderConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const order = useQuery(api.orders.get, { id: id as Id<'orders'> });
  const orderItems = useQuery(api.orders.getOrderItems, { orderId: id as Id<'orders'> });

  if (order === undefined || orderItems === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (order === null) {
    return (
      <View style={styles.loadingContainer}>
        <ZineText variant="display">ORDER NOT FOUND</ZineText>
        <Pressable style={styles.backButton} onPress={() => router.push('/(customer)')}>
          <ZineText variant="sectionHeader" style={styles.backButtonText}>
            BACK TO MENU
          </ZineText>
        </Pressable>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[order.status] ?? Colors.faint;
  const statusLabel = STATUS_LABELS[order.status] ?? order.status.toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.md }]}>
        {/* Header */}
        <View style={styles.header}>
          <ZineText variant="kicker">ORDER PLACED</ZineText>
          <ZineText variant="display" style={styles.orderNumber}>
            {order.orderNumber}
          </ZineText>
          <Rule variant="double" />
        </View>

        {/* Status */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <ZineText variant="mono" style={[styles.statusLabel, { color: statusColor }]}>
              {statusLabel}
            </ZineText>
          </View>
          <ZineText variant="body" style={styles.statusHint}>
            This page updates automatically.
          </ZineText>
        </View>

        <Rule variant="single" />

        {/* Items */}
        <View style={styles.itemsSection}>
          <ZineText variant="mono" style={styles.sectionLabel}>ITEMS</ZineText>
          {orderItems.map((item) => (
            <View key={item._id} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <ZineText variant="mono" style={styles.itemQty}>{item.quantity}x</ZineText>
                <ZineText variant="body" style={styles.itemName}>{item.name}</ZineText>
              </View>
              <ZineText variant="price" style={styles.itemPrice}>
                {'\u20AC'}{((item.price * item.quantity) / 100).toFixed(2)}
              </ZineText>
            </View>
          ))}
        </View>

        <Rule variant="double" />

        {/* Order Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <ZineText variant="mono" style={styles.detailLabel}>SUBTOTAL</ZineText>
            <ZineText variant="mono" style={styles.detailValue}>
              {'\u20AC'}{((order.total - order.deliveryFee) / 100).toFixed(2)}
            </ZineText>
          </View>
          <View style={styles.detailRow}>
            <ZineText variant="mono" style={styles.detailLabel}>DELIVERY</ZineText>
            <ZineText variant="mono" style={styles.detailValue}>
              {order.deliveryFee === 0 ? 'FREE' : `\u20AC${(order.deliveryFee / 100).toFixed(2)}`}
            </ZineText>
          </View>
          <Rule variant="single" />
          <View style={styles.detailRow}>
            <ZineText variant="mono" style={styles.totalLabel}>TOTAL</ZineText>
            <ZineText variant="mono" style={styles.totalValue}>
              {'\u20AC'}{(order.total / 100).toFixed(2)}
            </ZineText>
          </View>
        </View>

        <Rule variant="double" />

        {/* Fulfillment & Payment */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <ZineText variant="mono" style={styles.detailLabel}>TYPE</ZineText>
            <ZineText variant="mono" style={styles.detailValue}>
              {order.fulfillmentType.toUpperCase()}
            </ZineText>
          </View>
          <View style={styles.detailRow}>
            <ZineText variant="mono" style={styles.detailLabel}>PAYMENT</ZineText>
            <ZineText variant="mono" style={styles.detailValue}>
              {order.paymentMethod.toUpperCase()}
            </ZineText>
          </View>
          {order.deliveryAddress && (
            <View style={styles.detailRow}>
              <ZineText variant="mono" style={styles.detailLabel}>ADDRESS</ZineText>
              <ZineText variant="mono" style={[styles.detailValue, styles.addressValue]}>
                {order.deliveryAddress}
              </ZineText>
            </View>
          )}
          {order.notes && (
            <View style={styles.detailRow}>
              <ZineText variant="mono" style={styles.detailLabel}>NOTES</ZineText>
              <ZineText variant="mono" style={[styles.detailValue, styles.addressValue]}>
                {order.notes}
              </ZineText>
            </View>
          )}
        </View>

        {/* Back Button */}
        <Pressable style={styles.backButton} onPress={() => router.push('/(customer)')}>
          <ZineText variant="sectionHeader" style={styles.backButtonText}>
            BACK TO MENU
          </ZineText>
        </Pressable>

        <Rule variant="ascii" style={styles.footerRule} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  orderNumber: {
    marginVertical: Spacing.sm,
    fontSize: FontSizes.giant,
  },
  statusSection: {
    marginBottom: Spacing.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 0,
  },
  statusLabel: {
    fontSize: FontSizes.sm,
    letterSpacing: 2,
  },
  statusHint: {
    color: Colors.faint,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  itemsSection: {
    marginVertical: Spacing.md,
  },
  sectionLabel: {
    color: Colors.faint,
    marginBottom: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  itemQty: {
    color: Colors.accent,
    fontSize: FontSizes.sm,
    minWidth: 28,
  },
  itemName: {
    color: Colors.primary,
    flex: 1,
  },
  itemPrice: {
    fontSize: FontSizes.sm,
  },
  detailsSection: {
    marginVertical: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  detailLabel: {
    color: Colors.faint,
    fontSize: FontSizes.sm,
  },
  detailValue: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
  },
  addressValue: {
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.lg,
  },
  totalLabel: {
    color: Colors.primary,
    fontSize: FontSizes.lg,
    fontFamily: Fonts.mono,
  },
  totalValue: {
    color: Colors.accent,
    fontSize: FontSizes.xl,
    fontFamily: Fonts.mono,
  },
  backButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    marginTop: Spacing.lg,
  },
  backButtonText: {
    color: Colors.black,
  },
  footerRule: {
    marginTop: Spacing.lg,
  },
});
