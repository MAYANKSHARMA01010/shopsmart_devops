import { Prisma } from '@prisma/client';

export interface CartProductSnapshot {
  id: string;
  name: string;
  slug: string;
  basePrice: Prisma.Decimal;
  comparePrice: Prisma.Decimal | null;
  stock: number;
  images: string[];
  isVisible: boolean;
}

export interface CartWithItems {
  id: string;
  userId: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    product: CartProductSnapshot;
  }>;
}

export interface CartItemDto {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: string;
    comparePrice: string | null;
    stock: number;
    images: string[];
    isVisible: boolean;
  };
  warnings: string[];
}

export interface CartResponseDto {
  id: string;
  userId: string;
  items: CartItemDto[];
  totalItems: number;
  subtotal: string;
}
