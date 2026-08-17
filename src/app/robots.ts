import type { MetadataRoute } from 'next';

// Neither robots.txt nor a sitemap existed, so every orphaned template page was
// as indexable as the real ones.
export default function robots(): MetadataRoute.Robots {
  const isZo = process.env.ZO_PUBLIC_SITE === 'true';
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      // /receipt carries a Stripe session id; /api is machine surface.
      disallow: isZo
        ? ['/api/', '/receipt/', '/pricing', '/auth/', '/dashboard', '/maintenance']
        : ['/api/', '/receipt/'],
    }],
    sitemap: 'https://zeroorigine.com/sitemap.xml',
  };
}
