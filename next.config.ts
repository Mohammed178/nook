import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the Turbopack root to this app dir. A stray package-lock.json in the
  // parent folder makes Next auto-detect the parent as the workspace root,
  // which puts the build cache outside this project and serves stale chunks
  // (manifested as phantom 404s and CSS edits not taking effect).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
