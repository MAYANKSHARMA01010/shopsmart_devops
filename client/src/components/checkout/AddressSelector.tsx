import React from 'react';
import { useCheckoutStore } from '../../stores/checkoutStore';

export const AddressSelector: React.FC = () => {
  const { addressId, setAddress } = useCheckoutStore();

  // For this milestone, we stub the addresses. 
  // In a real app, we would fetch addresses via React Query from an address API.
  const addresses = [
    { id: 'addr_1', label: 'Home', fullAddress: '123 Main St, City, Country' },
    { id: 'addr_2', label: 'Office', fullAddress: '456 Business Ave, City, Country' }
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Select Delivery Address</h2>
      <div className="space-y-3">
        {addresses.map((addr) => (
          <label 
            key={addr.id} 
            className={`flex items-start p-4 border rounded-md cursor-pointer transition-colors ${
              addressId === addr.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200'
            }`}
          >
            <input
              type="radio"
              name="address"
              className="mt-1 mr-3 text-primary-600 focus:ring-primary-500"
              checked={addressId === addr.id}
              onChange={() => setAddress(addr.id)}
            />
            <div>
              <span className="block font-medium text-gray-800">{addr.label}</span>
              <span className="block text-sm text-gray-500 mt-1">{addr.fullAddress}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};
