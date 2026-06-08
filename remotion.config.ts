/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { enableTailwind } from '@remotion/tailwind-v4';

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setColorSpace("bt709");
// Required for <HtmlInCanvas> WebGL overlay effects to render in Studio and CLI.
Config.setChromiumOpenGlRenderer("angle");
Config.overrideWebpackConfig((config) => {
  // Apply Tailwind first
  const tailwindConfig = enableTailwind(config);

  // Fix Node.js v22 + webpack WASM hash crash
  // by switching to Node's native xxhash64
  return {
    ...tailwindConfig,
    output: {
      ...tailwindConfig.output,
      hashFunction: "xxhash64",
    },
  };
});
