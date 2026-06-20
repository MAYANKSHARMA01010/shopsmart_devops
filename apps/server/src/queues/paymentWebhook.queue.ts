import { Queue } from 'bullmq';
import redis from '../shared/utils/redis';
import logger from '../shared/utils/logger';

export const paymentWebhookQueue = new Queue('payment-webhook', { 
  connection: redis 
});

paymentWebhookQueue.on('error', (err) => {
  if ((err as any).code !== 'ECONNREFUSED') {
    logger.error('paymentWebhookQueue error:', { error: err.message });
  }
});

export const enqueueWebhook = async (eventId: string, gateway: string, payload: unknown) => {
  await paymentWebhookQueue.add(
    'process-webhook',
    { eventId, gateway, payload },
    {
      jobId: eventId,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    }
  );
};
