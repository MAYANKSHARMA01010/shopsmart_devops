import React from 'react';
import { useCartStore } from '../../cart/store/cartStore';
import { useCheckoutStore } from '../store/checkoutStore';

export const OrderSummary: React.FC = () => {
  const { cart } = useCartStore();
  const { couponCode } = useCheckoutStore();

  const subtotal = parseFloat(cart.subtotal);
  // Optimistic mock calculation for coupon
  const discount = couponCode ? subtotal * 0.1 : 0; // 10% discount for any code
  const tax = (subtotal - discount) * 0.18; // 18% tax
  const total = subtotal - discount + tax;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Order Summary</h2>
      
      <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
        {cart.items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm">
            <div className="flex flex-col">
              <span className="text-gray-800 font-medium">{item.product.name}</span>
              <span className="text-gray-500">Qty: {item.quantity}</span>
            </div>
            <span className="text-gray-800 font-medium">
              ${(parseFloat(item.product.basePrice) * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-800 font-medium">${subtotal.toFixed(2)}</span>
        </div>
        
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount ({couponCode})</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-gray-600">Tax (18%)</span>
          <span className="text-gray-800 font-medium">${tax.toFixed(2)}</span>
        </div>
      </div>

      <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between items-center">
        <span className="text-lg font-bold text-gray-800">Total</span>
        <span className="text-2xl font-bold text-primary-600">${total.toFixed(2)}</span>
      </div>
    </div>
  );
};
