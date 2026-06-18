import { describe, it, expect } from 'vitest';
import { checkoutInitSchema } from '../src/modules/checkout/checkout.validator';

describe('Checkout Validator', () => {
  it('validates correct payload successfully', () => {
    const payload = {
      addressId: '123e4567-e89b-12d3-a456-426614174000',
      gatewayProvider: 'RAZORPAY',
      couponCode: 'SAVE20'
    };
    const result = checkoutInitSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects invalid gateway provider', () => {
    const payload = {
      addressId: '123e4567-e89b-12d3-a456-426614174000',
      gatewayProvider: 'PAYPAL'
    };
    const result = checkoutInitSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects invalid addressId', () => {
    const payload = {
      addressId: 'not-a-uuid',
      gatewayProvider: 'STRIPE'
    };
    const result = checkoutInitSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
