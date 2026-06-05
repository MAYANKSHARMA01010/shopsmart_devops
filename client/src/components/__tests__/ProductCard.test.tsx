/**
 * ProductCard Component Tests
 * Framework: Vitest + @testing-library/react
 *
 * Migrated from Jest (M1 — Vitest migration milestone).
 * Test behaviour is identical to the previous suite.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from '../ProductCard';

const mockProduct = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Test Product',
  description: 'Test Description',
  basePrice: 99.99,
  comparePrice: null,
  stock: 10,
  sku: 'TST-PROD',
  images: [],
  isVisible: true,
  categoryId: '00000000-0000-0000-0000-000000000002',
  slug: 'test-product',
  category: {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'electronics',
    slug: 'electronics',
    description: 'Electronics description',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('ProductCard', () => {
  it('renders product name and price', () => {
    render(<ProductCard product={mockProduct as any} onDelete={() => {}} deleting={false} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('₹99.99')).toBeInTheDocument();
  });

  it('renders stock status correctly for in-stock product', () => {
    render(<ProductCard product={mockProduct as any} onDelete={() => {}} deleting={false} />);
    expect(screen.getByText('10 in stock')).toBeInTheDocument();
  });

  it('renders low stock warning when stock < 5', () => {
    render(
      <ProductCard product={{ ...mockProduct, stock: 3 } as any} onDelete={() => {}} deleting={false} />
    );
    expect(screen.getByText('Low stock — 3 left')).toBeInTheDocument();
  });

  it('renders out of stock when stock is 0', () => {
    render(
      <ProductCard product={{ ...mockProduct, stock: 0 } as any} onDelete={() => {}} deleting={false} />
    );
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });

  it('shows deleting state when deleting prop is true', () => {
    render(<ProductCard product={mockProduct as any} onDelete={() => {}} deleting={true} />);
    expect(screen.getByText(/Deleting/i)).toBeInTheDocument();
  });

  it('calls onDelete with product id when Delete button clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<ProductCard product={mockProduct as any} onDelete={onDelete} deleting={false} />);

    await user.click(screen.getByRole('button', { name: /delete test product/i }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith(mockProduct.id);
  });

  it('disables delete button when deleting is true', () => {
    render(<ProductCard product={mockProduct as any} onDelete={() => {}} deleting={true} />);
    expect(screen.getByRole('button', { name: /delete test product/i })).toBeDisabled();
  });
});
