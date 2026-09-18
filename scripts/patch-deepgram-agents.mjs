import fs from "node:fs";
import path from "node:path";

const files = [
  path.resolve("node_modules/@deepgram/agents/dist/index.js"),
  path.resolve("node_modules/@deepgram/agents/dist/index.cjs"),
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");

  // Fix: When url is provided with apiKey or non-JWT token, don't force Bearer or omit apiKey from DeepgramClient
  code = code.replace(
    /o=i\?new ([a-zA-Z0-9_.]+)\(\{accessToken:n,\.\.\.s\}\):new \1\(\{apiKey:n\}\),a=i\?`Bearer \$\{n\}`:`Token \$\{n\}`/g,
    (match, clientClass) => {
      return `const _isJwt=typeof n==="string"&&n.split(".").length===3;const o=_isJwt?new ${clientClass}({accessToken:n,...s}):new ${clientClass}({apiKey:n,...s}),a=_isJwt?\`Bearer \${n}\`:\`Token \${n}\``;
    }
  );

  fs.writeFileSync(file, code, "utf8");
}
console.log("Patched @deepgram/agents successfully!");
