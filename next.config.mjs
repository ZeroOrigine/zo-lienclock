/** @type {import('next').NextConfig} */

// ZO_PUBLIC_SITE is set ONLY on the zeroorigine.com Netlify site. This repo is
// both the public website AND the product template, so template scaffolding was
// leaking onto the public domain: /pricing served a "$29/month" plan that does
// not exist, and /auth/login offered an account system the parent brand has no
// such thing as. Products still inherit every one of those pages.
const ZO_PUBLIC_SITE = process.env.ZO_PUBLIC_SITE === 'true';

const nextConfig = {
  env: { ZO_PUBLIC_SITE: ZO_PUBLIC_SITE ? 'true' : 'false' },
  async redirects() {
    return [
      // /about is a REAL page on every product, built from src/lib/zo-meta.json.
      // A global redirect would break all of them. zeroorigine.com ships the
      // sentinel meta, so there /about 404s and is sent to the live registry
      // instead: the honest answer to "what is this" is every attempt, alive
      // and dead.
      ...(ZO_PUBLIC_SITE
        ? [{ source: '/about', destination: '/products', permanent: false }]
        : []),
      { source: '/minds', destination: '/#minds', permanent: false },
      { source: '/constitution', destination: '/#constitution', permanent: false },
    ];
  },
};

export default nextConfig;
