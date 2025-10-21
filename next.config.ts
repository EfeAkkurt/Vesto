import fs from "fs";
import { createRequire } from "module";
import type { NextConfig } from "next";

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  webpack: (config, { webpack }) => {
    const fetchBrowserPath = require.resolve("ipfs-utils/src/http/fetch.browser.js");
    const fetchNodePath = require.resolve("ipfs-utils/src/http/fetch.node.js");
    const fetchEntryPath = require.resolve("ipfs-utils/src/http/fetch.js");

    const emptyModule = require.resolve("./src/shims/empty.js");
    const signingShim = require.resolve("./src/shims/signing-browser.js");

    const signingTarget = require.resolve("@stellar/stellar-base/lib/signing.js");
    fs.copyFileSync(signingShim, signingTarget);

    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      [fetchNodePath]: fetchBrowserPath,
      [fetchEntryPath]: fetchBrowserPath,
      "ipfs-utils/src/http/fetch.node": fetchBrowserPath,
      "ipfs-utils/src/http/fetch.node.js": fetchBrowserPath,
      "@stellar/stellar-sdk": require.resolve("./src/shims/stellar-sdk.ts"),
      "sodium-native": emptyModule,
      "sodium-native$": false,
      "require-addon": emptyModule,
      "require-addon$": false,
      "node-pre-gyp": emptyModule,
    };

    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      fs: false,
      path: false,
      crypto: false,
      stream: false,
    };

    config.module.noParse = /sodium-native|require-addon/;

    config.module.exprContextCritical = false;

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/fetch\.node$/, fetchBrowserPath),
      new webpack.DefinePlugin({
        "typeof XMLHttpRequest": JSON.stringify("function"),
      }),
      new webpack.IgnorePlugin({ resourceRegExp: /^sodium-native$/ }),
      new webpack.IgnorePlugin({ resourceRegExp: /^require-addon$/ }),
      new webpack.IgnorePlugin({ resourceRegExp: /^node-pre-gyp$/ }),
    );

    return config;
  },
};

export default nextConfig;
