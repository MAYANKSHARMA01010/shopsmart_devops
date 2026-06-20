import { Prisma, OrderStatus, PaymentGatewayProvider } from '@prisma/client';
import { AppError } from '../../shared/utils/AppError';
import { PaymentService } from '../payment/payment.service';
import logger from '../../shared/utils/logger';
import { checkoutRepository } from './checkout.repository';

export interface OrderContext {
  userId: string;
  addressId: string;
  gatewayProvider: PaymentGatewayProvider;
  couponCode?: string;
  notes?: string;
}

export class CheckoutService {
  async initializeCheckout(context: OrderContext) {
    const { userId, addressId, gatewayProvider, couponCode, notes } = context;
    // 1. Validate Cart
    const cart = await checkoutRepository.findCartByUserId(userId);

    if (!cart || cart.items.length === 0) {
      throw new AppError('Cart is empty', 400);
    }

    // 2. Validate Address
    const address = await checkoutRepository.findAddressById(addressId);

    if (!address || address.userId !== userId) {
      throw new AppError('Invalid address', 400);
    }

    // 3. Calculate totals & build items
    let subtotal = new Prisma.Decimal(0);
    const cartItems = cart.items.map(item => {
      const price = item.product.basePrice;
      const total = price.mul(item.quantity);
      subtotal = subtotal.add(total);
      return {
        productId: item.productId,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: item.quantity,
        priceAtPurchase: price,
        stock: item.product.stock,
      };
    });

    let discountAmount = new Prisma.Decimal(0);
    if (couponCode) {
      const coupon = await checkoutRepository.findCouponByCode(couponCode);
      if (coupon && coupon.isActive && coupon.startDate <= new Date() && coupon.endDate >= new Date()) {
        if (coupon.type === 'FLAT') {
          discountAmount = coupon.value;
        } else {
          discountAmount = subtotal.mul(coupon.value).div(100);
          if (coupon.maxDiscountLimit && discountAmount.gt(coupon.maxDiscountLimit)) {
            discountAmount = coupon.maxDiscountLimit;
          }
        }
      } else {
        throw new AppError('Invalid or expired coupon', 400);
      }
    }

    let taxableAmount = subtotal.sub(discountAmount);
    if (taxableAmount.lt(0)) {
      taxableAmount = new Prisma.Decimal(0);
      discountAmount = subtotal; 
    }

    const taxAmount = taxableAmount.mul(0.10); // 10% mock tax
    const shippingAmount = new Prisma.Decimal(50); // Flat 50
    const totalAmount = taxableAmount.add(taxAmount).add(shippingAmount);

    if (totalAmount.lte(0)) {
      throw new AppError('Total amount must be greater than zero', 400);
    }

    // 4. Sort Product IDs to avoid deadlocks
    const sortedProductIds = cartItems.map(i => i.productId).sort();

    // 5. BEGIN TRANSACTION
    const orderData = await checkoutRepository.executeTransaction(async (tx) => {
      // 6. SELECT FOR UPDATE
      const lockedProducts = await checkoutRepository.lockProductsForUpdate(sortedProductIds, tx);

      const stockMap = new Map<string, number>();
      lockedProducts.forEach(p => stockMap.set(p.id, p.stock));

      // 7. Validate and Deduct Stock
      for (const item of cartItems) {
        const currentStock = stockMap.get(item.productId);
        if (currentStock === undefined || currentStock < item.quantity) {
          throw new AppError(`Insufficient stock for product ${item.productName}`, 400);
        }
        await checkoutRepository.decrementProductStock(item.productId, item.quantity, tx);
      }

      // 8. Create Pending Order
      const initialStatus = OrderStatus.PENDING;
      
      const order = await checkoutRepository.createOrder({
        user: { connect: { id: userId } },
        address: { connect: { id: addressId } },
        status: initialStatus,
        subtotal,
        discountAmount,
        taxAmount,
        shippingAmount,
        totalAmount,
        couponCode,
        notes,
        shippingAddressSnapshot: address as unknown as Prisma.InputJsonValue,
        billingAddressSnapshot: address as unknown as Prisma.InputJsonValue,
        items: {
          create: cartItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            quantity: item.quantity,
            priceAtPurchase: item.priceAtPurchase
          }))
        }
      }, tx);

      // 9. Audit Log
      await checkoutRepository.createOrderAuditLog({
        order: { connect: { id: order.id } },
        action: 'ORDER_CREATED',
        newState: initialStatus,
        actorId: userId,
        actorType: 'USER'
      }, tx);

      // 10. Clear Cart
      await checkoutRepository.clearCartItems(cart.id, tx);
      
      return order;
    },
    {
      maxWait: 10000,
      timeout: 20000
    });

    // 11. Payment Gateway Abstraction
    const paymentService = new PaymentService(gatewayProvider);
    const paymentResponse = await paymentService.createOrder({
      orderId: orderData.id,
      amount: orderData.totalAmount,
      currency: 'INR'
    });

    const paymentRecord = await checkoutRepository.createPaymentRecord({
      order: { connect: { id: orderData.id } },
      gateway: gatewayProvider,
      gatewayOrderId: paymentResponse.gatewayOrderId,
      amount: orderData.totalAmount,
      currency: 'INR',
      rawResponse: paymentResponse.rawResponse as Prisma.InputJsonValue
    });

    logger.info('checkout.initialized', { orderId: orderData.id, userId });

    return {
      order: orderData,
      payment: paymentRecord,
      gatewayOrderId: paymentResponse.gatewayOrderId
    };
  }
}
