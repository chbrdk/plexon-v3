/** @type {import('next').NextConfig} */
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const msqdxUiRoot = process.env.MSQDX_UI_BASE
  ? resolve(__dirname, process.env.MSQDX_UI_BASE)
  : resolve(__dirname, '..', 'msqdx-ui')

const basePath = process.env.BASE_PATH ?? ''

const nextConfig = {
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  typescript: {
    // Temporary: generative UI + board still on @msqdx/react / MUI shims.
    // Inventory: knowledge/msqdx-shim-inventory.md — flip to false when that set is small + tsc clean.
    ignoreBuildErrors: true,
  },
  experimental: {
    // Lower peak RSS during Coolify/Docker webpack builds.
    webpackMemoryOptimizations: true,
  },
  webpack: (config) => {
    config.resolve.symlinks = true
    config.resolve.modules = [resolve(__dirname, 'node_modules'), 'node_modules']
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': resolve(__dirname),
      '@msqdx/ui': resolve(__dirname, 'lib/msqdx-ui.ts'),
      '@msqdx/ui-shell': resolve(__dirname, 'lib/msqdx-ui-shell.ts'),
      '@msqdx/ui/styles.css': resolve(msqdxUiRoot, 'packages/ui/src/styles.css'),
      '@msqdx/ui-tokens': resolve(msqdxUiRoot, 'packages/ui-tokens/dist/index.js'),
      '@msqdx/react': resolve(__dirname, 'lib/msqdx-react-bridge/index.ts'),
      '@msqdx/tokens': resolve(__dirname, 'lib/msqdx-tokens-shim.ts'),
      '@mui/material': resolve(__dirname, 'lib/mui-shim.tsx'),
      '@mui/material/Popper': resolve(__dirname, 'lib/mui-subpath-shims.ts'),
      '@mui/material/Toolbar': resolve(__dirname, 'lib/mui-subpath-shims.ts'),
      '@mui/material/Snackbar': resolve(__dirname, 'lib/mui-subpath-shims.ts'),
      '@mui/material/Slider': resolve(__dirname, 'lib/mui-subpath-shims.ts'),
    }
    return config
  },
}

export default nextConfig
