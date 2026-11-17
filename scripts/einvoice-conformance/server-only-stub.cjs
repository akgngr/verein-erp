/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS preload hook for tsx (--require) */
// The generator runs outside Next.js: let "server-only" resolve to an empty module
// (react-pdf cannot load under the "react-server" export condition).
const Module = require("node:module");
const original = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") return require.resolve("./empty.cjs");
  return original.call(this, request, ...rest);
};
