import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Exclude Supabase Edge Functions from the build
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        // Ignore Deno-specific imports
        'jsr:@supabase/supabase-js@2': 'commonjs jsr:@supabase/supabase-js@2'
      })
    }
    return config
  },

  // Exclude supabase/functions directory from Next.js compilation
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'].map(ext => ext),
};

export default nextConfig;
