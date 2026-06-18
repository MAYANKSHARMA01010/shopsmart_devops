import { OrderStatus } from '@prisma/client';
import { AppError } from '../../shared/utils/AppError';

export class OrderStateMachine {
  private static transitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
    [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
    [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.REFUNDED]: [],
  };

  public static canTransition(current: OrderStatus, next: OrderStatus): boolean {
    const allowed = this.transitions[current];
    return allowed ? allowed.includes(next) : false;
  }

  public static transition(current: OrderStatus, next: OrderStatus): OrderStatus {
    if (!this.canTransition(current, next)) {
      throw new AppError(`Invalid status transition from ${current} to ${next}`, 400);
    }
    return next;
  }
}
