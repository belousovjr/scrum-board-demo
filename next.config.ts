import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from "next/dist/shared/lib/constants";
import SerwistNext from "@serwist/next";

module.exports = async (phase: string) => {
  const nextConfig = {};

  if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_BUILD) {
    const withSerwist = SerwistNext({
      swSrc: "src/app/sw.ts",
      swDest: "public/sw.js",
    });
    return withSerwist(nextConfig);
  }

  return nextConfig;
};
