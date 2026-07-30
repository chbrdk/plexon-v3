/** @type {import('next').NextConfig} */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// DS_BASE = path to design system root (e.g. ../msqdx-design-system or ../MSQDX-DS/msqdx-design-system)
const dsBase = process.env.DS_BASE
  ? resolve(__dirname, process.env.DS_BASE, 'packages')
  : resolve(__dirname, '..', 'msqdx-design-system', 'packages');

// Wenn Coolify/Proxy die App unter einem Pfad bereitstellt (z. B. /plexon), hier setzen
const basePath = process.env.BASE_PATH ?? '';

const nextConfig = {
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  reactStrictMode: true,
  transpilePackages: ['@msqdx/react', '@msqdx/tokens'],
  experimental: {
    optimizePackageImports: ['@mui/material', '@msqdx/tokens'],
  },
  webpack: (config) => {
    config.resolve.symlinks = true;
    config.resolve.modules = [resolve(__dirname, 'node_modules'), 'node_modules'];
    // Resolve @msqdx packages from DS path (dev uses --webpack, so alias is required)
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': resolve(__dirname),
      '@msqdx/react': resolve(dsBase, 'react'),
      '@msqdx/tokens': resolve(dsBase, 'tokens'),
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      '@msqdx/react': resolve(dsBase, 'react', 'dist', 'index.js'),
      '@msqdx/tokens': resolve(dsBase, 'tokens', 'dist', 'index.js'),
    },
  },
};

export default nextConfig;
