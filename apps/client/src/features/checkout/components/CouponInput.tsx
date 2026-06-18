import React, { useState } from 'react';
import { useCheckoutStore } from '../store/checkoutStore';

export const CouponInput: React.FC = () => {
  const { couponCode, setCoupon } = useCheckoutStore();
  const [inputCode, setInputCode] = useState(couponCode || '');
  const [loading, setLoading] = useState(false);

  const handleApply = () => {
    if (!inputCode.trim()) return;
    setLoading(true);
    
    // Optimistic UI for coupon application
    setTimeout(() => {
      setCoupon(inputCode.trim().toUpperCase());
      setLoading(false);
    }, 500); // simulate API delay
  };

  const handleRemove = () => {
    setCoupon(null);
    setInputCode('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Have a coupon?</h2>
      
      {couponCode ? (
        <div className="flex items-center justify-between bg-green-50 text-green-700 p-3 rounded-md border border-green-200">
          <span className="font-medium">Applied: {couponCode}</span>
          <button 
            onClick={handleRemove}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter coupon code"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={handleApply}
            disabled={loading || !inputCode.trim()}
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            {loading ? 'Applying...' : 'Apply'}
          </button>
        </div>
      )}
    </div>
  );
};
