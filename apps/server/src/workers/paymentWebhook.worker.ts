import { Worker } from 'bullmq';
import redis from '../shared/utils/redis';
import prisma from '../shared/config/database';
import { OrderStatus, PaymentTransactionStatus } from '@prisma/client';
import { OrderStateMachine } from '../modules/checkout/order.state-machine';
import logger from '../shared/utils/logger';

export const processPaymentWebhookJob = async (job: { data: any }) => {
  const { eventId, gateway, payload } = job.data;
  
  if (gateway !== 'RAZORPAY') return;
  
  const eventName = payload.event;
  if (eventName === 'payment.captured') {
    const paymentEntity = payload.payload.payment.entity;
    const gatewayOrderId = paymentEntity.order_id;
    const gatewayPaymentId = paymentEntity.id;

    const payment = await prisma.payment.findUnique({ where: { gatewayOrderId } });
    if (!payment) {
      throw new Error(`Payment record not found for gatewayOrderId: ${gatewayOrderId}`);
    }

    const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
    if (!order) {
      throw new Error(`Order not found for payment: ${payment.id}`);
    }

    if (order.status === OrderStatus.PENDING) {
      const nextStatus = OrderStateMachine.transition(order.status, OrderStatus.CONFIRMED);
      
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { status: nextStatus }
        }),
        prisma.payment.update({
          where: { id: payment.id },
          data: { 
            status: PaymentTransactionStatus.CAPTURED, 
            gatewayPaymentId,
          }
        }),
        prisma.orderAuditLog.create({
          data: {
            orderId: order.id,
            action: 'WEBHOOK_PAYMENT_CAPTURED',
            oldState: order.status,
            newState: nextStatus,
            actorId: 'SYSTEM',
            actorType: 'WEBHOOK'
          }
        })
      ]);
      
      logger.info('Order confirmed via webhook', { orderId: order.id, eventId });
    }
  } else if (eventName === 'payment.failed') {
      const paymentEntity = payload.payload.payment.entity;
      const gatewayOrderId = paymentEntity.order_id;
      const payment = await prisma.payment.findUnique({ where: { gatewayOrderId } });
      if (payment) {
          const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
          if (order && order.status === OrderStatus.PENDING) {
              const nextStatus = OrderStateMachine.transition(order.status, OrderStatus.CANCELLED);
              await prisma.$transaction([
                  prisma.order.update({ where: { id: order.id }, data: { status: nextStatus } }),
                  prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentTransactionStatus.FAILED } }),
                  prisma.orderAuditLog.create({ data: { orderId: order.id, action: 'WEBHOOK_PAYMENT_FAILED', oldState: order.status, newState: nextStatus, actorId: 'SYSTEM', actorType: 'WEBHOOK' } })
              ]);
          }
      }
  }
  
  await prisma.processedWebhook.update({
    where: { id: eventId },
    data: { status: 'PROCESSED' }
  });

};

export const paymentWebhookWorker = new Worker('payment-webhook', processPaymentWebhookJob as any, { connection: redis });

paymentWebhookWorker.on('failed', (job, err) => {
  logger.error('Webhook processing failed', { jobId: job?.id, error: err.message });
});

paymentWebhookWorker.on('error', (err) => {
  if ((err as any).code !== 'ECONNREFUSED') {
    logger.error('Worker error:', err.message);
  }
});
