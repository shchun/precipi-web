// Loads src/simulator.jsx (a plain-JS IIFE that attaches makeSimulator +
// SIM_CONST to `window`) into a throwaway sandbox so tests can drive it in Node.
const fs = require("node:fs");
const path = require("node:path");

function loadSimulator() {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "src", "simulator.jsx"),
    "utf8"
  );
  const window = {};
  // The IIFE references the free variable `window`; pass it in as a parameter.
  new Function("window", src)(window);
  return window; // { makeSimulator, SIM_CONST }
}

module.exports = { loadSimulator };
