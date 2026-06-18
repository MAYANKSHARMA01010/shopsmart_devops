import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CheckoutPage from '../../app/checkout/page';
import { useCartStore } from '../cart/store/cartStore';

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

// Mock child components to keep it simple
vi.mock('./components/AddressSelector', () => ({
  AddressSelector: () => <div data-testid="address-selector">Address Selector</div>
}));
vi.mock('./components/CouponInput', () => ({
  CouponInput: () => <div data-testid="coupon-input">Coupon Input</div>
}));
vi.mock('./components/OrderSummary', () => ({
  OrderSummary: () => <div data-testid="order-summary">Order Summary</div>
}));
vi.mock('./components/PaymentButton', () => ({
  PaymentButton: () => <div data-testid="payment-button">Payment Button</div>
}));

describe('CheckoutPage', () => {
  beforeEach(() => {
    useCartStore.getState().resetCart();
  });

  it('renders empty state if cart is empty', () => {
    render(<CheckoutPage />);
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('renders checkout layout if cart has items', () => {
    // Add a mock item to cart store
    useCartStore.setState({
      cart: {
        id: '1',
        userId: '1',
        totalItems: 1,
        subtotal: '10.00',
        items: [{
          id: '1',
          productId: 'prod_1',
          quantity: 1,
          warnings: [],
          product: { id: 'prod_1', name: 'Product 1', slug: 'product-1', basePrice: '10.00', comparePrice: null, stock: 10, images: [] as string[], isVisible: true }
        }]
      }
    });

    render(<CheckoutPage />);
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByTestId('address-selector')).toBeInTheDocument();
    expect(screen.getByTestId('coupon-input')).toBeInTheDocument();
    expect(screen.getByTestId('order-summary')).toBeInTheDocument();
    expect(screen.getByTestId('payment-button')).toBeInTheDocument();
  });
});
