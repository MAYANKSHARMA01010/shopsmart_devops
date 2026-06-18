import { describe, it, expect, vi } from 'vitest';
import { checkoutService } from './checkout.service';
import api from '../../../lib/apiClient';

vi.mock('../../../lib/apiClient', () => ({
  default: {
    post: vi.fn()
  }
}));

describe('checkoutService', () => {
  it('calls initializeCheckout correctly', async () => {
    (api.post as any).mockResolvedValue({ data: { success: true, order: { id: 'ord_1' } } });
    
    const res = await checkoutService.initializeCheckout({
      addressId: 'addr_1',
      gatewayProvider: 'RAZORPAY'
    });

    expect(api.post).toHaveBeenCalledWith('/api/checkout/initialize', { addressId: 'addr_1', gatewayProvider: 'RAZORPAY' });
    expect(res.success).toBe(true);
    expect(res.order.id).toBe('ord_1');
  });

  it('calls verifyPayment correctly', async () => {
    (api.post as any).mockResolvedValue({ data: { success: true } });
    
    const res = await checkoutService.verifyPayment({
      razorpay_order_id: 'rzp_ord_1',
      razorpay_payment_id: 'rzp_pay_1',
      razorpay_signature: 'sig'
    });

    expect(api.post).toHaveBeenCalledWith('/api/payment/verify', {
      razorpay_order_id: 'rzp_ord_1',
      razorpay_payment_id: 'rzp_pay_1',
      razorpay_signature: 'sig'
    });
    expect(res.success).toBe(true);
  });
});
