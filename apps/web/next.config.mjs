import path from "node:path";

const nextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  transpilePackages: ["@gen/shared"]
};

export default nextConfig;
