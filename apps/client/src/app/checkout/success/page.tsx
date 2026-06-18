'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function SuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 px-4">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-green-100 text-center max-w-md w-full">
        <div className="text-green-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-600 mb-8">Thank you for your purchase. We will email you the order details.</p>
        <button 
          onClick={() => router.push('/products')}
          className="w-full px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}
