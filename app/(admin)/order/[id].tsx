import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';
import { formatDate } from '@/utils/format-date';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.statusPending,
  confirmed: Colors.statusConfirmed,
  preparing: Colors.statusPreparing,
  ready: Colors.statusReady,
  completed: Colors.statusCompleted,
  cancelled: Colors.statusCancelled,
};

const NEXT_STATUS: Record<string, OrderStatus> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};

export default function AdminOrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const updateStatus = useMutation(api.orders.updateStatus);
  const [isUpdating, setIsUpdating] = useState(false);

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
        <Text style={styles.errorText}>ORDER NOT FOUND</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>GO BACK</Text>
        </Pressable>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[order.status] ?? Colors.faint;
  const nextStatus = NEXT_STATUS[order.status];

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setIsUpdating(true);
    try {
      await updateStatus({ id: order._id as Id<'orders'>, status: newStatus });
    } catch {
      // silently fail
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>{'\u2190'} ORDERS</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Order Number & Status */}
        <View style={styles.titleSection}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{order.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CUSTOMER</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>NAME</Text>
            <Text style={styles.infoValue}>{order.customerName}</Text>
          </View>
          {order.customerEmail && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>EMAIL</Text>
              <Text style={styles.infoValue}>{order.customerEmail}</Text>
            </View>
          )}
          {order.customerPhone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>PHONE</Text>
              <Text style={styles.infoValue}>{order.customerPhone}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Order Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DETAILS</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>TYPE</Text>
            <Text style={styles.infoValue}>{order.fulfillmentType.toUpperCase()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>PAYMENT</Text>
            <Text style={styles.infoValue}>{order.paymentMethod.toUpperCase()}</Text>
          </View>
          {order.deliveryAddress && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ADDRESS</Text>
              <Text style={[styles.infoValue, styles.infoValueWrap]}>
                {order.deliveryAddress}
              </Text>
            </View>
          )}
          {order.notes && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>NOTES</Text>
              <Text style={[styles.infoValue, styles.infoValueWrap]}>{order.notes}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>PLACED</Text>
            <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ITEMS</Text>
          {orderItems.map((item) => (
            <View key={item._id} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemQty}>{item.quantity}x</Text>
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <Text style={styles.itemPrice}>
                {'\u20AC'}{((item.price * item.quantity) / 100).toFixed(2)}
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SUBTOTAL</Text>
            <Text style={styles.infoValue}>
              {'\u20AC'}{((order.total - order.deliveryFee) / 100).toFixed(2)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>DELIVERY FEE</Text>
            <Text style={styles.infoValue}>
              {order.deliveryFee === 0 ? 'FREE' : `\u20AC${(order.deliveryFee / 100).toFixed(2)}`}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>
              {'\u20AC'}{(order.total / 100).toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Actions */}
        {order.status !== 'completed' && order.status !== 'cancelled' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACTIONS</Text>
            <View style={styles.actionsRow}>
              {nextStatus && (
                <Pressable
                  style={[styles.actionButton, styles.advanceButton]}
                  onPress={() => handleStatusChange(nextStatus)}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator color={Colors.black} size="small" />
                  ) : (
                    <Text style={styles.advanceButtonText}>
                      {'\u2192'} {nextStatus.toUpperCase()}
                    </Text>
                  )}
                </Pressable>
              )}
              <Pressable
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleStatusChange('cancelled')}
                disabled={isUpdating}
              >
                <Text style={styles.cancelButtonText}>CANCEL ORDER</Text>
              </Pressable>
            </View>
          </View>
        )}
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
  },
  errorText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },
  header: {
    // paddingTop applied dynamically via useSafeAreaInsets
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  backLink: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    letterSpacing: 1,
  },
  backButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 0,
  },
  backButtonText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.black,
    fontWeight: '700',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  orderNumber: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xxxl,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 0,
  },
  statusBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.black,
    fontWeight: '700',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.rule,
    marginVertical: Spacing.md,
  },
  section: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.accent,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  infoLabel: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 1,
  },
  infoValue: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  infoValueWrap: {
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.lg,
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
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    minWidth: 28,
  },
  itemName: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  itemPrice: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  totalLabel: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '700',
  },
  totalValue: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xl,
    color: Colors.accent,
    fontWeight: '700',
  },
  actionsRow: {
    gap: Spacing.sm,
  },
  actionButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    minHeight: 48,
  },
  advanceButton: {
    backgroundColor: Colors.accent,
  },
  advanceButtonText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    color: Colors.black,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: Colors.statusCancelled,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    color: Colors.statusCancelled,
    letterSpacing: 1,
  },
});
