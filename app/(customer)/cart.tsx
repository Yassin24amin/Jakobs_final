import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ZineText } from '@/components/zine-text';
import { Rule } from '@/components/rule';
import { CartItem } from '@/components/cart/cart-item';
import { CartSummary } from '@/components/cart/cart-summary';
import { useCart } from '@/contexts/cart-context';
import { useAuth } from '@/contexts/auth-context';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

type FulfillmentType = 'pickup' | 'delivery';
type PaymentMethod = 'card' | 'cash';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const createOrder = useMutation(api.orders.create);

  const [fulfillment, setFulfillment] = useState<FulfillmentType>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [customerName, setCustomerName] = useState(user?.name ?? '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deliveryFee = fulfillment === 'delivery' ? 300 : 0;
  const subtotal = totalPrice;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter your name.');
      return;
    }
    if (fulfillment === 'delivery' && !deliveryAddress.trim()) {
      Alert.alert('Error', 'Please enter a delivery address.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Error', 'Your cart is empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createOrder({
        customerName: customerName.trim(),
        customerEmail: user?.email,
        customerPhone: customerPhone.trim() || undefined,
        userId: isAuthenticated && user ? (user.id as Id<'users'>) : undefined,
        items: items.map((item) => ({
          menuItemId: item.menuItemId as Id<'menuItems'>,
          quantity: item.quantity,
          notes: item.notes,
        })),
        notes: notes.trim() || undefined,
        fulfillmentType: fulfillment,
        deliveryAddress: fulfillment === 'delivery' ? deliveryAddress.trim() : undefined,
        paymentMethod,
      });

      clearCart();
      router.push(`/order-confirmation/${result.orderId}`);
    } catch (error: any) {
      Alert.alert('Order Failed', error?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
        <ZineText variant="kicker">NOTHING HERE YET</ZineText>
        <ZineText variant="display" style={styles.emptyTitle}>YOUR CART IS EMPTY</ZineText>
        <Rule variant="double" />
        <ZineText variant="body" style={styles.emptyBody}>
          Browse our menu and add some items to get started.
        </ZineText>
        <Pressable style={styles.browseButton} onPress={() => router.push('/(customer)')}>
          <ZineText variant="sectionHeader" style={styles.browseButtonText}>
            BROWSE MENU
          </ZineText>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.md }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <ZineText variant="kicker">YOUR ORDER</ZineText>
          <ZineText variant="display" style={styles.title}>CART</ZineText>
          <Rule variant="double" />
        </View>

        {/* Cart Items */}
        <View style={styles.section}>
          {items.map((item) => (
            <CartItem
              key={item.menuItemId}
              menuItemId={item.menuItemId}
              name={item.name}
              price={item.price}
              quantity={item.quantity}
            />
          ))}
        </View>

        {/* Summary */}
        <CartSummary subtotal={subtotal} deliveryFee={deliveryFee} total={total} />

        {/* Fulfillment Toggle */}
        <View style={styles.section}>
          <ZineText variant="mono" style={styles.label}>FULFILLMENT</ZineText>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleButton, fulfillment === 'pickup' && styles.toggleActive]}
              onPress={() => setFulfillment('pickup')}
            >
              <ZineText
                variant="mono"
                style={[styles.toggleText, fulfillment === 'pickup' && styles.toggleTextActive]}
              >
                PICKUP
              </ZineText>
            </Pressable>
            <Pressable
              style={[styles.toggleButton, fulfillment === 'delivery' && styles.toggleActive]}
              onPress={() => setFulfillment('delivery')}
            >
              <ZineText
                variant="mono"
                style={[styles.toggleText, fulfillment === 'delivery' && styles.toggleTextActive]}
              >
                DELIVERY
              </ZineText>
            </Pressable>
          </View>

          {fulfillment === 'delivery' && (
            <>
              <ZineText variant="mono" style={styles.label}>DELIVERY ADDRESS</ZineText>
              <TextInput
                style={styles.input}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="enter your address"
                placeholderTextColor={Colors.faint}
                multiline
              />
            </>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <ZineText variant="mono" style={styles.label}>PAYMENT METHOD</ZineText>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleButton, paymentMethod === 'card' && styles.toggleActive]}
              onPress={() => setPaymentMethod('card')}
            >
              <ZineText
                variant="mono"
                style={[styles.toggleText, paymentMethod === 'card' && styles.toggleTextActive]}
              >
                CARD
              </ZineText>
            </Pressable>
            <Pressable
              style={[styles.toggleButton, paymentMethod === 'cash' && styles.toggleActive]}
              onPress={() => setPaymentMethod('cash')}
            >
              <ZineText
                variant="mono"
                style={[styles.toggleText, paymentMethod === 'cash' && styles.toggleTextActive]}
              >
                CASH
              </ZineText>
            </Pressable>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Rule variant="single" />
          <ZineText variant="mono" style={[styles.label, { marginTop: Spacing.md }]}>NAME</ZineText>
          <TextInput
            style={styles.input}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="your name"
            placeholderTextColor={Colors.faint}
          />

          <ZineText variant="mono" style={styles.label}>PHONE</ZineText>
          <TextInput
            style={styles.input}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="phone number (optional)"
            placeholderTextColor={Colors.faint}
            keyboardType="phone-pad"
          />

          <ZineText variant="mono" style={styles.label}>NOTES</ZineText>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="special requests (optional)"
            placeholderTextColor={Colors.faint}
            multiline
          />
        </View>

        {/* Place Order Button */}
        <Pressable
          style={[styles.placeOrderButton, isSubmitting && styles.buttonDisabled]}
          onPress={handlePlaceOrder}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.black} />
          ) : (
            <ZineText variant="sectionHeader" style={styles.placeOrderText}>
              PLACE ORDER
            </ZineText>
          )}
        </Pressable>

        <Rule variant="ascii" style={styles.footerRule} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    marginVertical: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.md,
  },
  label: {
    color: Colors.faint,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.rule,
    backgroundColor: Colors.surface,
    color: Colors.primary,
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    padding: Spacing.md,
    borderRadius: 0,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 0,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.rule,
    backgroundColor: Colors.surface,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  toggleText: {
    color: Colors.faint,
  },
  toggleTextActive: {
    color: Colors.black,
  },
  placeOrderButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    marginTop: Spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  placeOrderText: {
    color: Colors.black,
  },
  browseButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    marginTop: Spacing.lg,
  },
  browseButtonText: {
    color: Colors.black,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  emptyTitle: {
    marginVertical: Spacing.md,
  },
  emptyBody: {
    marginTop: Spacing.md,
    color: Colors.faint,
  },
  footerRule: {
    marginTop: Spacing.lg,
  },
});
