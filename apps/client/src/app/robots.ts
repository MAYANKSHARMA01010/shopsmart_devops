import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/profile/', '/cart/', '/checkout/', '/orders/'],
    },
    sitemap: 'https://shopsmart-demo.com/sitemap.xml',
  };
}
