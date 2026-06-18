import { Prisma } from '@prisma/client';

export interface CreateOrderParams {
  orderId: string;
  amount: Prisma.Decimal;
  currency?: string;
  notes?: Record<string, string>;
}

export interface VerifySignatureParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface PaymentGateway {
  createOrder(params: CreateOrderParams): Promise<{ gatewayOrderId: string; rawResponse: Record<string, unknown> }>;
  verifySignature(params: VerifySignatureParams): Promise<boolean>;
  refund(paymentId: string, amount?: Prisma.Decimal): Promise<{ status: string; rawResponse: Record<string, unknown> }>;
  healthCheck(): Promise<boolean>;
}
