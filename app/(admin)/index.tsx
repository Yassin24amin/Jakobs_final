import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
type FilterTab = 'all' | OrderStatus;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'pending', label: 'PENDING' },
  { key: 'confirmed', label: 'CONFIRMED' },
  { key: 'preparing', label: 'PREPARING' },
  { key: 'ready', label: 'READY' },
];

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

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminOrderDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>ORDERS</Text>
        <Pressable
          style={styles.posButton}
          onPress={() => router.push('/(pos)')}
        >
          <Text style={styles.posButtonText}>POS MODE</Text>
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {FILTER_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Order List */}
      {activeTab === 'all' ? (
        <AllOrdersList />
      ) : (
        <FilteredOrdersList status={activeTab} />
      )}
    </View>
  );
}

function AllOrdersList() {
  const orders = useQuery(api.orders.listAll, {});

  if (orders === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>NO ORDERS YET</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.listContent}>
      {orders.map((order) => (
        <OrderCard key={order._id} order={order} />
      ))}
    </ScrollView>
  );
}

function FilteredOrdersList({ status }: { status: OrderStatus }) {
  const orders = useQuery(api.orders.listByStatus, { status });

  if (orders === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>NO {status.toUpperCase()} ORDERS</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.listContent}>
      {orders.map((order) => (
        <OrderCard key={order._id} order={order} />
      ))}
    </ScrollView>
  );
}

function OrderCard({ order }: { order: any }) {
  const router = useRouter();
  const updateStatus = useMutation(api.orders.updateStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const statusColor = STATUS_COLORS[order.status] ?? Colors.faint;
  const nextStatus = NEXT_STATUS[order.status];

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setIsUpdating(true);
    try {
      await updateStatus({ id: order._id as Id<'orders'>, status: nextStatus });
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message ?? 'Could not update order status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel order ${order.orderNumber}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsUpdating(true);
            try {
              await updateStatus({ id: order._id as Id<'orders'>, status: 'cancelled' });
            } catch (error: any) {
              Alert.alert('Cancel Failed', error?.message ?? 'Could not cancel order. Please try again.');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Pressable
      style={styles.orderCard}
      onPress={() => router.push(`/(admin)/order/${order._id}`)}
    >
      {/* Top row */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardLeft}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <Text style={styles.customerName}>{order.customerName}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.timeAgo}>{timeAgo(order.createdAt)}</Text>
          <Text style={styles.totalText}>
            {'\u20AC'}{(order.total / 100).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Status */}
      <View style={styles.cardStatusRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusBadgeText}>{order.status.toUpperCase()}</Text>
        </View>
        <Text style={styles.fulfillmentText}>
          {order.fulfillmentType.toUpperCase()} {'\u00B7'} {order.paymentMethod.toUpperCase()}
        </Text>
      </View>

      {/* Action Buttons */}
      {order.status !== 'completed' && order.status !== 'cancelled' && (
        <View style={styles.actionsRow}>
          {nextStatus && (
            <Pressable
              style={[styles.actionButton, styles.advanceButton]}
              onPress={handleAdvance}
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
            onPress={handleCancel}
            disabled={isUpdating}
          >
            <Text style={styles.cancelButtonText}>CANCEL</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    // paddingTop applied dynamically via useSafeAreaInsets
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xl,
    color: Colors.primary,
    letterSpacing: 2,
    fontWeight: '700',
  },
  posButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.accent,
  },
  posButtonText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.black,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tabsWrapper: {
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  tabsContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    marginRight: Spacing.xs,
  },
  tabActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tabText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 1,
  },
  tabTextActive: {
    color: Colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    color: Colors.faint,
    letterSpacing: 1,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  orderCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    padding: Spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardLeft: {
    flex: 1,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  orderNumber: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  customerName: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.faint,
    marginTop: 2,
  },
  timeAgo: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
  },
  totalText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    color: Colors.accent,
    marginTop: 2,
  },
  cardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 0,
  },
  statusBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.black,
    fontWeight: '700',
    letterSpacing: 1,
  },
  fulfillmentText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    minHeight: 44,
  },
  advanceButton: {
    backgroundColor: Colors.accent,
  },
  advanceButtonText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
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
    fontSize: FontSizes.sm,
    color: Colors.statusCancelled,
    letterSpacing: 1,
  },
});
