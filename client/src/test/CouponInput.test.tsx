import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CouponInput } from '../components/checkout/CouponInput';
import { useCheckoutStore } from '../stores/checkoutStore';

describe('CouponInput', () => {
  beforeEach(() => {
    useCheckoutStore.getState().reset();
  });

  it('renders input and apply button initially', () => {
    render(<CouponInput />);
    expect(screen.getByPlaceholderText('Enter coupon code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('applies coupon optimistically', async () => {
    render(<CouponInput />);
    
    const input = screen.getByPlaceholderText('Enter coupon code');
    fireEvent.change(input, { target: { value: 'SAVE20' } });
    
    const button = screen.getByRole('button', { name: 'Apply' });
    fireEvent.click(button);

    expect(button).toHaveTextContent('Applying...');
    
    await waitFor(() => {
      expect(useCheckoutStore.getState().couponCode).toBe('SAVE20');
      expect(screen.getByText('Applied: SAVE20')).toBeInTheDocument();
    });
  });

  it('removes coupon correctly', () => {
    useCheckoutStore.getState().setCoupon('SAVE10');
    render(<CouponInput />);
    
    expect(screen.getByText('Applied: SAVE10')).toBeInTheDocument();
    
    const removeBtn = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(removeBtn);
    
    expect(useCheckoutStore.getState().couponCode).toBeNull();
    expect(screen.getByPlaceholderText('Enter coupon code')).toBeInTheDocument();
  });
});
