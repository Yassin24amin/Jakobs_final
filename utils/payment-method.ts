export function getPaymentMethodLabel(paymentMethod: string | null | undefined) {
  if (paymentMethod == null) {
    return "";
  }

  switch (paymentMethod) {
    case "cash":
      return "CASH";
    case "card":
      return "CARD";
    case "sumup_terminal":
      return "CARD TERMINAL";
    case "stripe_tap_to_pay_iphone":
      return "TAP TO PAY (IPHONE)";
    case "stripe_tap_to_pay_android":
      return "TAP TO PAY (ANDROID)";
    default:
      return paymentMethod.replace(/_/g, " ").toUpperCase();
  }
}
