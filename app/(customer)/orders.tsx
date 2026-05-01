import React from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ZineText } from '@/components/zine-text';
import { Rule } from '@/components/rule';
import { useAuth } from '@/contexts/auth-context';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';
import { formatDate } from '@/utils/format-date';

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.statusPending,
  confirmed: Colors.statusConfirmed,
  preparing: Colors.statusPreparing,
  ready: Colors.statusReady,
  completed: Colors.statusCompleted,
  cancelled: Colors.statusCancelled,
};

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <ZineText variant="kicker">ORDER HISTORY</ZineText>
        <ZineText variant="display" style={styles.emptyTitle}>
          SIGN IN TO VIEW YOUR ORDERS
        </ZineText>
        <Rule variant="double" />
        <ZineText variant="body" style={styles.emptyBody}>
          Track your orders and reorder your favourites.
        </ZineText>
        <Pressable style={styles.signInButton} onPress={() => router.push('/login')}>
          <ZineText variant="sectionHeader" style={styles.signInButtonText}>
            SIGN IN
          </ZineText>
        </Pressable>
      </View>
    );
  }

  return <OrdersList userId={user.id} />;
}

function OrdersList({ userId }: { userId: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const orders = useQuery(api.orders.getMyOrders, { userId: userId as Id<'users'> });

  if (orders === undefined) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <ZineText variant="kicker">ORDER HISTORY</ZineText>
        <ZineText variant="display" style={styles.emptyTitle}>NO ORDERS YET</ZineText>
        <Rule variant="double" />
        <ZineText variant="body" style={styles.emptyBody}>
          Place your first order to see it here.
        </ZineText>
        <Pressable style={styles.signInButton} onPress={() => router.push('/(customer)')}>
          <ZineText variant="sectionHeader" style={styles.signInButtonText}>
            BROWSE MENU
          </ZineText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.header}>
          <ZineText variant="kicker">YOUR HISTORY</ZineText>
          <ZineText variant="display" style={styles.pageTitle}>ORDERS</ZineText>
          <Rule variant="double" />
        </View>

        {orders.map((order) => (
          <Pressable
            key={order._id}
            style={styles.orderCard}
            onPress={() => router.push(`/order-confirmation/${order._id}`)}
          >
            <View style={styles.orderTopRow}>
              <ZineText variant="sectionHeader">{order.orderNumber}</ZineText>
              <ZineText variant="price">
                {'\u20AC'}{(order.total / 100).toFixed(2)}
              </ZineText>
            </View>

            <View style={styles.orderBottomRow}>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: STATUS_COLORS[order.status] ?? Colors.faint },
                  ]}
                />
                <ZineText variant="mono" style={styles.statusText}>
                  {order.status.toUpperCase()}
                </ZineText>
              </View>
              <ZineText variant="mono" style={styles.dateText}>
                {formatDate(order.createdAt)}
              </ZineText>
            </View>

            <Rule variant="single" style={styles.cardRule} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.lg,
  },
  pageTitle: {
    marginVertical: Spacing.sm,
  },
  emptyTitle: {
    marginVertical: Spacing.md,
  },
  emptyBody: {
    marginTop: Spacing.md,
    color: Colors.faint,
  },
  signInButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    marginTop: Spacing.lg,
  },
  signInButtonText: {
    color: Colors.black,
  },
  orderCard: {
    marginBottom: Spacing.sm,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  orderBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 0,
  },
  statusText: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
  },
  dateText: {
    color: Colors.faint,
    fontSize: FontSizes.xs,
  },
  cardRule: {
    marginBottom: Spacing.sm,
  },
});
