import type { NextConfig } from "next";
import { withLinera } from "linera-react-client/config/nextjs";

const nextConfig: NextConfig = {
  // Your Next.js config here
};

// withLinera already adds all required headers (COOP/COEP) for all routes
export default withLinera(nextConfig, {
  enableHeaders: true, // Explicitly enable (this is default)
});
