const Module = require("module");
const path = require("path");

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    request = path.resolve(process.cwd(), "src", request.slice(2));
  }
  return origResolve.call(this, request, parent, isMain, options);
};

const jiti = require("jiti")();
jiti.register();
