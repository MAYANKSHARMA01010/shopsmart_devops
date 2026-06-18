'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useCheckoutStore } from '../../../features/checkout/store/checkoutStore';

export default function FailurePage() {
  const router = useRouter();
  const { error } = useCheckoutStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 px-4">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-red-100 text-center max-w-md w-full">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-6">{error || 'Something went wrong during the transaction. Please try again.'}</p>
        <div className="space-y-3">
          <button 
            onClick={() => router.push('/checkout')}
            className="w-full px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
          >
            Retry Payment
          </button>
          <button 
            onClick={() => router.push('/products')}
            className="w-full px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
          >
            Return to Store
          </button>
        </div>
      </div>
    </div>
  );
}
