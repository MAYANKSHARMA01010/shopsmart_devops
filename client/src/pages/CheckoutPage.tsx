import React, { useEffect } from 'react';
import { AddressSelector } from '../components/checkout/AddressSelector';
import { CouponInput } from '../components/checkout/CouponInput';
import { OrderSummary } from '../components/checkout/OrderSummary';
import { PaymentButton } from '../components/checkout/PaymentButton';
import { useCartStore } from '../stores/cartStore';
import { useCheckoutStore } from '../stores/checkoutStore';
import { useRouter } from 'next/navigation';

export const CheckoutPage: React.FC = () => {
  const { cart } = useCartStore();
  const router = useRouter();
  const resetCheckout = useCheckoutStore(state => state.reset);

  useEffect(() => {
    // Reset store on mount
    resetCheckout();
  }, [resetCheckout]);

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Your cart is empty</h1>
        <button 
          onClick={() => router.push('/products')}
          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-7 space-y-6">
            <AddressSelector />
            <CouponInput />
          </div>

          {/* Right Column - Summary & Action */}
          <div className="lg:col-span-5">
            <div className="sticky top-8 space-y-6">
              <OrderSummary />
              <PaymentButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
