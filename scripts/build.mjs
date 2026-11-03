import { build, context } from "esbuild";
import {
  mkdir,
  copyFile,
  readFile,
  writeFile,
  readdir,
} from "node:fs/promises";
await mkdir("dist", { recursive: true });
for (const f of ["index.html", "favicon.svg"])
  await copyFile("public/" + f, "dist/" + f);
const common = {
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  sourcemap: false,
  legalComments: "eof",
  logLevel: "info",
};
// Keep the unmodified LGPL dependency replaceable, separate from application code.
const vendor = await build({
  ...common,
  metafile: true,
  stdin: {
    contents:
      'import p5 from "p5/core"; import accessibility from "p5/accessibility"; accessibility(p5); export default p5;',
    resolveDir: process.cwd(),
    sourcefile: "p5-entry.js",
  },
  outfile: "dist/p5.js",
});
const bundled = new Set(
  Object.keys(vendor.metafile.inputs).map(
    (path) =>
      path
        .replaceAll("\\", "/")
        .match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1],
  ),
);
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
let notices =
  "Carretel — third-party notices\n\nThe p5 library is bundled separately in p5.js and may be replaced independently.\nSource: https://github.com/processing/p5.js/tree/v2.3.4\nExact versions and reproducible module entry are in package-lock.json and scripts/build.mjs.\n\n";
for (const [path, entry] of Object.entries(lock.packages)) {
  if (
    !path.startsWith("node_modules/") ||
    entry.dev ||
    !bundled.has(path.slice(13))
  )
    continue;
  const names = await readdir(path);
  const files = names.filter((n) =>
    /^(license|licence|copying)(\.|$)/i.test(n),
  );
  notices += `\n--- ${path.slice(13)} ${entry.version} ---\n`;
  for (const file of files)
    notices += (await readFile(path + "/" + file, "utf8")) + "\n";
  if (!files.length) {
    if (path === "node_modules/omggif")
      notices +=
        (await readFile(path + "/omggif.js", "utf8")).split('"use strict"')[0] +
        "\n";
    else throw Error("License file requires review: " + path);
  }
}
await writeFile("dist/third-party.txt", notices);
const options = {
  ...common,
  entryPoints: ["src/main.ts"],
  outfile: "dist/game.js",
  plugins: [
    {
      name: "local-p5",
      setup(b) {
        b.onResolve({ filter: /^p5$/ }, () => ({
          path: "./p5.js",
          external: true,
        }));
      },
    },
  ],
};
if (process.argv.includes("--serve")) {
  const c = await context(options);
  await c.watch();
  await c.serve({ servedir: "dist", host: "127.0.0.1", port: 4257 });
  console.log("Carretel: http://127.0.0.1:4257/");
} else await build(options);
