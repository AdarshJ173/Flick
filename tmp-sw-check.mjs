import fs from "node:fs";
const code = fs.readFileSync("public/sw.js", "utf8");
try {
  new Function(code);
  console.log("sw.js syntax: OK");
} catch (e) {
  console.log("sw.js syntax ERROR:", e.message);
}
