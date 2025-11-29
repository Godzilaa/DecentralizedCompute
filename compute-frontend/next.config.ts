import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Ensure Next uses this folder as the root for output tracing when multiple
  // lockfiles exist in parent directories (silences the warning when building).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
