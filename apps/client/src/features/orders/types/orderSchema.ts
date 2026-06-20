export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: string | number;
  product?: {
    id: string;
    name: string;
    images: string[];
    basePrice?: string | number;
  };
}

export interface Order {
  id: string;
  userId: string;
  addressId: string;
  status: string;
  totalAmount: string | number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  address?: any;
  paymentDetails?: any;
}
