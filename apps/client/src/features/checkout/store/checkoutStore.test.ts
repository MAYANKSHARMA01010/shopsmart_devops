import { describe, it, expect, beforeEach } from 'vitest';
import { useCheckoutStore } from './checkoutStore';

describe('checkoutStore', () => {
  beforeEach(() => {
    useCheckoutStore.getState().reset();
  });

  it('sets and clears address', () => {
    const store = useCheckoutStore.getState();
    expect(store.addressId).toBeNull();
    store.setAddress('addr_1');
    expect(useCheckoutStore.getState().addressId).toBe('addr_1');
  });

  it('sets and clears coupon', () => {
    const store = useCheckoutStore.getState();
    expect(store.couponCode).toBeNull();
    store.setCoupon('SAVE10');
    expect(useCheckoutStore.getState().couponCode).toBe('SAVE10');
  });

  it('updates payment status and clears error automatically on success', () => {
    const store = useCheckoutStore.getState();
    store.setPaymentStatus('failure');
    expect(useCheckoutStore.getState().error).toBe('Payment failed');
    
    store.setPaymentStatus('success');
    expect(useCheckoutStore.getState().error).toBeNull();
    expect(useCheckoutStore.getState().paymentStatus).toBe('success');
  });

  it('resets correctly', () => {
    const store = useCheckoutStore.getState();
    store.setAddress('addr_1');
    store.setCoupon('SAVE10');
    store.setPaymentStatus('success');
    
    store.reset();
    const updatedStore = useCheckoutStore.getState();
    expect(updatedStore.addressId).toBeNull();
    expect(updatedStore.couponCode).toBeNull();
    expect(updatedStore.paymentStatus).toBe('idle');
  });
});
