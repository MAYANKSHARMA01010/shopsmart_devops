import { create } from 'zustand';

interface CheckoutState {
  addressId: string | null;
  couponCode: string | null;
  paymentStatus: 'idle' | 'processing' | 'success' | 'failure';
  error: string | null;
  setAddress: (id: string) => void;
  setCoupon: (code: string | null) => void;
  setPaymentStatus: (status: 'idle' | 'processing' | 'success' | 'failure') => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  addressId: null,
  couponCode: null,
  paymentStatus: 'idle',
  error: null,
  setAddress: (id) => set({ addressId: id }),
  setCoupon: (code) => set({ couponCode: code }),
  setPaymentStatus: (status) => set({ paymentStatus: status, error: status === 'failure' ? 'Payment failed' : null }),
  setError: (error) => set({ error }),
  reset: () => set({ addressId: null, couponCode: null, paymentStatus: 'idle', error: null })
}));
