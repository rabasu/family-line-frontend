const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' giscus.app analytics.umami.is;
  style-src 'self' 'unsafe-inline';
  img-src * blob: data:;
  media-src *.s3.amazonaws.com;
  connect-src *;
  font-src 'self';
  frame-src giscus.app
`

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\n/g, ''),
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

const devOnlyExtensions = ['dev.ts', 'dev.tsx']
const productionExtensions = ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx']

/**
 * @type {import('next').NextConfig}
 **/
module.exports = () => {
  const plugins = [withBundleAnalyzer]
  return plugins.reduce((acc, next) => next(acc), {
    reactStrictMode: true,
    output: process.env.NODE_ENV === 'development' ? undefined : 'export',
    pageExtensions: process.env.NODE_ENV === 'development' ? [...devOnlyExtensions, ...productionExtensions] : productionExtensions,
    eslint: {
      dirs: ['app', 'components', 'scripts'],
    },
    images: {
      unoptimized: true,
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'picsum.photos',
        },
      ],
    },
    ...(process.env.NODE_ENV === 'development'
      ? {
          async headers() {
            return [
              {
                source: '/(.*)',
                headers: securityHeaders,
              },
            ]
          },
        }
      : {}),
    webpack: (config) => {
      const { IgnorePlugin } = require('webpack')

      config.module.rules.push({
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      })

      config.module.exprContextCritical = false
      config.module.exprContextRecursive = false

      config.plugins.push(
        new IgnorePlugin({
          resourceRegExp: /\.backup\.json$/,
        }),
        new IgnorePlugin({
          resourceRegExp: /backup\//,
        })
      )

      return config
    },
  })
}
