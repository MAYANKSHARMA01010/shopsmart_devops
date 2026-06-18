import React from 'react';
import { useInitializeCheckout, useVerifyPayment } from '../hooks/useCheckout';
import { useCheckoutStore } from '../store/checkoutStore';
import { loadRazorpay } from '../../../lib/razorpay';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export const PaymentButton: React.FC = () => {
  const router = useRouter();
  const { addressId, couponCode, paymentStatus, setPaymentStatus, setError } = useCheckoutStore();
  const initializeCheckout = useInitializeCheckout();
  const verifyPayment = useVerifyPayment();

  const handlePayment = async () => {
    if (!addressId) {
      toast.error('Please select an address');
      return;
    }

    try {
      // 1. Initialize Checkout (Backend)
      const checkoutRes = await initializeCheckout.mutateAsync({
        addressId,
        gatewayProvider: 'RAZORPAY',
        couponCode: couponCode || undefined
      });

      const orderData = checkoutRes.data.order;
      
      // 2. Load Razorpay dynamically
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        throw new Error('Razorpay SDK failed to load');
      }

      // 3. Open Razorpay Modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_12345',
        amount: orderData.total * 100, // paise
        currency: 'USD', // or INR based on your pricing logic
        name: 'ShopSmart',
        description: 'Order Payment',
        order_id: checkoutRes.data.payment.gatewayOrderId,
        handler: async (response: any) => {
          // 4. Verify Payment (Backend)
          try {
            await verifyPayment.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            router.push('/checkout/success');
          } catch (err) {
            router.push('/checkout/failure');
          }
        },
        prefill: {
          name: 'ShopSmart Customer',
          email: 'customer@example.com'
        },
        theme: {
          color: '#000000'
        },
        modal: {
          ondismiss: () => {
            setPaymentStatus('idle');
            toast('Payment cancelled');
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setPaymentStatus('failure');
        setError(response.error.description);
        router.push('/checkout/failure');
      });

      rzp.open();
    } catch (error: any) {
      toast.error(error.message || 'Payment initiation failed');
    }
  };

  const isProcessing = paymentStatus === 'processing';

  return (
    <button
      onClick={handlePayment}
      disabled={isProcessing || !addressId}
      className={`w-full py-4 rounded-lg text-lg font-semibold text-white transition-all ${
        isProcessing || !addressId
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-primary-600 hover:bg-primary-700 shadow-md hover:shadow-lg'
      }`}
    >
      {isProcessing ? 'Processing...' : 'Pay Now'}
    </button>
  );
};
