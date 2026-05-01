import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface POSCartItem {
  menuItemId: Id<"menuItems">;
  name: string;
  price: number; // cents
  quantity: number;
  notes?: string;
}

type PaymentState =
  | "idle"
  | "processing_cash"
  | "processing_card"
  | "paid"
  | "failed";

interface POSCartContextType {
  // Cart manipulation
  items: POSCartItem[];
  addItem: (menuItemId: Id<"menuItems">, name: string, price: number) => void;
  removeItem: (menuItemId: Id<"menuItems">) => void;
  setQuantity: (menuItemId: Id<"menuItems">, qty: number) => void;
  setItemNotes: (menuItemId: Id<"menuItems">, notes: string) => void;
  clearCart: () => void;

  // Order metadata
  customerName: string;
  setCustomerName: (name: string) => void;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;

  // Computed
  subtotal: number;
  total: number;
  itemCount: number;
  isEmpty: boolean;

  // Payment
  paymentState: PaymentState;
  cashTendered: number;
  setCashTendered: (amount: number) => void;
  changeDue: number;
  paymentError: string | null;

  // Actions
  submitCashOrder: (
    operatorId: Id<"users">
  ) => Promise<{ orderId: string; orderNumber: string; changeGiven?: number }>;
  submitCardOrder: (
    operatorId: Id<"users">,
    sumupTransactionId: string
  ) => Promise<{ orderId: string; orderNumber: string }>;
  resetForNextOrder: () => void;
  setPaymentState: (state: PaymentState) => void;
  setPaymentError: (error: string | null) => void;

  // Last completed
  lastCompletedOrderId: string | null;
  lastCompletedOrderNumber: string | null;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const POSCartContext = createContext<POSCartContextType | undefined>(undefined);

export function POSCartProvider({ children }: { children: React.ReactNode }) {
  // Cart state
  const [items, setItems] = useState<POSCartItem[]>([]);
  const [customerName, setCustomerName] = useState("Walk-in");
  const [orderNotes, setOrderNotes] = useState("");

  // Payment state
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [cashTendered, setCashTendered] = useState(0);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Last completed order
  const [lastCompletedOrderId, setLastCompletedOrderId] = useState<
    string | null
  >(null);
  const [lastCompletedOrderNumber, setLastCompletedOrderNumber] = useState<
    string | null
  >(null);

  // Convex
  const createPOSOrder = useMutation(api.pos.createOrder);

  // -------------------------------------------------------------------------
  // Cart manipulation
  // -------------------------------------------------------------------------

  const addItem = useCallback(
    (menuItemId: Id<"menuItems">, name: string, price: number) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.menuItemId === menuItemId);
        if (existing) {
          return prev.map((i) =>
            i.menuItemId === menuItemId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          );
        }
        return [...prev, { menuItemId, name, price, quantity: 1 }];
      });
    },
    []
  );

  const removeItem = useCallback((menuItemId: Id<"menuItems">) => {
    setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  }, []);

  const setQuantity = useCallback((menuItemId: Id<"menuItems">, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.menuItemId === menuItemId ? { ...i, quantity: qty } : i
      )
    );
  }, []);

  const setItemNotes = useCallback(
    (menuItemId: Id<"menuItems">, notes: string) => {
      setItems((prev) =>
        prev.map((i) =>
          i.menuItemId === menuItemId ? { ...i, notes } : i
        )
      );
    },
    []
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setOrderNotes("");
    setCustomerName("Walk-in");
    setCashTendered(0);
    setPaymentError(null);
  }, []);

  // -------------------------------------------------------------------------
  // Computed
  // -------------------------------------------------------------------------

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const total = subtotal; // No delivery fee for counter orders

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const isEmpty = items.length === 0;

  const changeDue = useMemo(
    () => Math.max(0, cashTendered - total),
    [cashTendered, total]
  );

  // -------------------------------------------------------------------------
  // Order submission
  // -------------------------------------------------------------------------

  const submitCashOrder = useCallback(
    async (operatorId: Id<"users">) => {
      if (isEmpty) throw new Error("Cart is empty");
      if (cashTendered < total) throw new Error("Insufficient cash tendered");

      setPaymentState("processing_cash");
      setPaymentError(null);

      try {
        const result = await createPOSOrder({
          customerName: customerName || "Walk-in",
          items: items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            notes: i.notes,
          })),
          notes: orderNotes || undefined,
          paymentMethod: "cash",
          cashTendered,
          posOperatorId: operatorId,
        });

        setPaymentState("paid");
        setLastCompletedOrderId(result.orderId);
        setLastCompletedOrderNumber(result.orderNumber);

        return {
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          changeGiven: result.changeGiven ?? undefined,
        };
      } catch (err) {
        setPaymentState("failed");
        const message =
          err instanceof Error ? err.message : "Failed to create order";
        setPaymentError(message);
        throw err;
      }
    },
    [isEmpty, cashTendered, total, items, customerName, orderNotes, createPOSOrder]
  );

  const submitCardOrder = useCallback(
    async (operatorId: Id<"users">, sumupTransactionId: string) => {
      if (isEmpty) throw new Error("Cart is empty");

      setPaymentState("processing_card");
      setPaymentError(null);

      try {
        const result = await createPOSOrder({
          customerName: customerName || "Walk-in",
          items: items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            notes: i.notes,
          })),
          notes: orderNotes || undefined,
          paymentMethod: "sumup_terminal",
          sumupTransactionId,
          posOperatorId: operatorId,
        });

        setPaymentState("paid");
        setLastCompletedOrderId(result.orderId);
        setLastCompletedOrderNumber(result.orderNumber);

        return {
          orderId: result.orderId,
          orderNumber: result.orderNumber,
        };
      } catch (err) {
        setPaymentState("failed");
        const message =
          err instanceof Error ? err.message : "Failed to create order";
        setPaymentError(message);
        throw err;
      }
    },
    [isEmpty, items, customerName, orderNotes, createPOSOrder]
  );

  const resetForNextOrder = useCallback(() => {
    setItems([]);
    setCustomerName("Walk-in");
    setOrderNotes("");
    setCashTendered(0);
    setPaymentState("idle");
    setPaymentError(null);
    setLastCompletedOrderId(null);
    setLastCompletedOrderNumber(null);
  }, []);

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const value = useMemo<POSCartContextType>(
    () => ({
      items,
      addItem,
      removeItem,
      setQuantity,
      setItemNotes,
      clearCart,
      customerName,
      setCustomerName,
      orderNotes,
      setOrderNotes,
      subtotal,
      total,
      itemCount,
      isEmpty,
      paymentState,
      cashTendered,
      setCashTendered,
      changeDue,
      paymentError,
      submitCashOrder,
      submitCardOrder,
      resetForNextOrder,
      setPaymentState,
      setPaymentError,
      lastCompletedOrderId,
      lastCompletedOrderNumber,
    }),
    [
      items,
      addItem,
      removeItem,
      setQuantity,
      setItemNotes,
      clearCart,
      customerName,
      orderNotes,
      subtotal,
      total,
      itemCount,
      isEmpty,
      paymentState,
      cashTendered,
      changeDue,
      paymentError,
      submitCashOrder,
      submitCardOrder,
      resetForNextOrder,
      lastCompletedOrderId,
      lastCompletedOrderNumber,
    ]
  );

  return (
    <POSCartContext.Provider value={value}>{children}</POSCartContext.Provider>
  );
}

export function usePOSCart(): POSCartContextType {
  const context = useContext(POSCartContext);
  if (!context) {
    throw new Error("usePOSCart must be used within a POSCartProvider");
  }
  return context;
}
