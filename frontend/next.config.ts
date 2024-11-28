import type { NextConfig } from "next/types";

const config: NextConfig = {
  experimental: {
    forceSwcTransforms: true,
  },
  compiler: {
    // Explicitly disable SWC
    emotion: false,
  },
  // Explicitly tell Next.js to use Babel
  babel: {
    // This will apply the .babelrc file
    configFile: true,
  },
};

export default config;
