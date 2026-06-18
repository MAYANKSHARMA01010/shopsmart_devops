/**
 * Payment provider abstraction layer.
 *
 * Both Razorpay (Phase 3 primary) and Stripe (future) implement
 * IPaymentProvider. Business logic depends only on this interface —
 * switching or adding providers requires zero changes to order/cart logic.
 */

/** Returned by createOrder — provider-specific order representation */
export interface PaymentOrder {
  /** Provider's order ID (e.g. Razorpay order_xxx) */
  id: string;
  /** Amount in smallest currency unit (paise for INR, cents for USD) */
  amount: number;
  /** ISO 4217 currency code (e.g. "INR", "USD") */
  currency: string;
  /** Merchant-assigned receipt/reference ID */
  receipt: string;
  /** Current status from the provider */
  status: string;
}

/** Returned by refund — provider-specific refund representation */
export interface RefundResult {
  /** Provider's refund ID */
  id: string;
  /** Original payment ID this refund applies to */
  paymentId: string;
  /** Amount refunded in smallest currency unit */
  amount: number;
  /** Current refund status from the provider */
  status: string;
}

/**
 * Common interface all payment provider adapters must implement.
 *
 * Phase 3 implementation: RazorpayProvider
 * Future: StripeProvider (implement this interface, register in PaymentFactory)
 */
export interface IPaymentProvider {
  /**
   * Create a payment order with the provider.
   * Must be called before showing the payment UI to the customer.
   */
  createOrder(amount: number, currency: string, receipt: string): Promise<PaymentOrder>;

  /**
   * Verify the HMAC signature from the provider's payment webhook/callback.
   * Returns true if the signature is valid (payment is authentic).
   */
  verifyPayment(orderId: string, paymentId: string, signature: string): boolean;

  /**
   * Initiate a partial or full refund for a completed payment.
   */
  refund(paymentId: string, amount: number): Promise<RefundResult>;
}
