import api from './apiClient';

export interface InitializeCheckoutParams {
  addressId: string;
  gatewayProvider: 'RAZORPAY' | 'STRIPE';
  couponCode?: string;
  notes?: string;
}

export interface VerifyPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const checkoutService = {
  initializeCheckout: async (params: InitializeCheckoutParams) => {
    const { data } = await api.post('/api/checkout/initialize', params);
    return data;
  },

  verifyPayment: async (params: VerifyPaymentParams) => {
    const { data } = await api.post('/api/payment/verify', params);
    return data;
  }
};
