import { MetadataRoute } from 'next';
import { productService } from '../features/products/services/productService';
import { categoryService } from '../features/categories/services/categoryService';

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://shopsmart-demo.com';

  const staticRoutes = [
    '',
    '/products',
    '/terms',
    '/privacy',
    '/cookies-policy',
    '/contact',
    '/login',
    '/register',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Fetch dynamic products
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const productsRes = await productService.getAll();
    productRoutes = (productsRes.data || []).map((product) => ({
      url: `${baseUrl}/products/${product.id}`,
      lastModified: new Date(product.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Sitemap: Failed to fetch products', error);
  }

  // Fetch dynamic categories
  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const catRes = await categoryService.getTree();
    categoryRoutes = (catRes.data || []).map((category) => ({
      url: `${baseUrl}/products?category=${category.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Sitemap: Failed to fetch categories', error);
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
