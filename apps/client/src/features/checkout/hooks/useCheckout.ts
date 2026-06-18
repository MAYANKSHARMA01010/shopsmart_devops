import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkoutService, InitializeCheckoutParams, VerifyPaymentParams } from '../services/checkout.service';
import { useCheckoutStore } from '../store/checkoutStore';
import { toast } from 'react-hot-toast';

export const useInitializeCheckout = () => {
  const { setPaymentStatus, setError } = useCheckoutStore();
  
  return useMutation({
    mutationFn: (params: InitializeCheckoutParams) => checkoutService.initializeCheckout(params),
    onMutate: () => {
      setPaymentStatus('processing');
      setError(null);
    },
    onError: (error: any) => {
      setPaymentStatus('failure');
      setError(error.response?.data?.message || 'Failed to initialize checkout');
      toast.error('Checkout initialization failed');
    }
  });
};

export const useVerifyPayment = () => {
  const queryClient = useQueryClient();
  const { setPaymentStatus, setError } = useCheckoutStore();

  return useMutation({
    mutationFn: (params: VerifyPaymentParams) => checkoutService.verifyPayment(params),
    onSuccess: () => {
      setPaymentStatus('success');
      // Invalidate cart and orders so they refresh
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => {
      setPaymentStatus('failure');
      setError(error.response?.data?.message || 'Payment verification failed');
      toast.error('Payment verification failed');
    }
  });
};
