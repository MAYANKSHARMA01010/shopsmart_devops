import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentButton } from './PaymentButton';
import { useCheckoutStore } from '../store/checkoutStore';
import * as hooks from '../hooks/useCheckout';
import * as rzp from '../../../lib/razorpay';
import { toast } from 'react-hot-toast';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => {
  const toastMock = Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  });
  return {
    toast: toastMock,
    default: toastMock
  };
});

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

describe('PaymentButton', () => {
  beforeEach(() => {
    useCheckoutStore.getState().reset();
    vi.clearAllMocks();
    
    // Mock the hooks
    vi.spyOn(hooks, 'useInitializeCheckout').mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ data: { order: { total: 100 }, payment: { gatewayOrderId: '123' } } })
    } as any);

    vi.spyOn(hooks, 'useVerifyPayment').mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({})
    } as any);

    vi.spyOn(rzp, 'loadRazorpay').mockResolvedValue(true);
    
    // Mock global Razorpay
    (window as any).Razorpay = vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      open: vi.fn()
    }));
  });

  it('is disabled when no address is selected', () => {
    useCheckoutStore.getState().setAddress('');
    render(<PaymentButton />);
    const btn = screen.getByRole('button', { name: 'Pay Now' });
    expect(btn).toBeDisabled();
  });



  it('calls initializeCheckout and opens Razorpay on click', async () => {
    useCheckoutStore.getState().setAddress('addr_1');
    render(<PaymentButton />);
    
    const btn = screen.getByRole('button', { name: 'Pay Now' });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(hooks.useInitializeCheckout().mutateAsync).toHaveBeenCalledWith({
        addressId: 'addr_1',
        gatewayProvider: 'RAZORPAY',
        couponCode: undefined
      });
      expect(rzp.loadRazorpay).toHaveBeenCalled();
      expect((window as any).Razorpay).toHaveBeenCalled();
    });
  });
});
