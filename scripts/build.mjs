import { build, context } from "esbuild";
import {
  mkdir,
  copyFile,
  readFile,
  writeFile,
  readdir,
  unlink,
} from "node:fs/promises";
import { resolve, dirname, basename } from "node:path";
const dist = resolve("dist");
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
  outdir: "dist",
  entryNames: "p5-[hash]",
});
const vendorName = basename(
  Object.keys(vendor.metafile.outputs).find((p) => p.endsWith(".js")),
);
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
await writeFile(
  "dist/third-party.txt",
  notices.replace("p5.js and", vendorName + " and"),
);
const options = {
  ...common,
  entryPoints: ["src/main.ts"],
  outdir: "dist",
  entryNames: "game-[hash]",
  metafile: true,
  plugins: [
    {
      name: "local-p5",
      setup(b) {
        b.onResolve({ filter: /^p5$/ }, () => ({
          path: "./" + vendorName,
          external: true,
        }));
      },
    },
    {
      name: "versioned-html",
      setup(b) {
        b.onEnd(async (result) => {
          if (result.errors.length) return;
          const output = Object.keys(result.metafile.outputs).find((p) =>
            p.endsWith(".js"),
          );
          const js = basename(output),
            css = basename(result.metafile.outputs[output].cssBundle);
          const html = (await readFile("public/index.html", "utf8"))
            .replace("./game.js", "./" + js)
            .replace("./game.css", "./" + css);
          await writeFile("dist/index.html", html);
          const keep = new Set([js, css, vendorName]);
          for (const file of await readdir(dist)) {
            if (
              !/^(game|p5)(-[A-Z0-9]{8})?\.(js|css)$/.test(file) ||
              keep.has(file)
            )
              continue;
            const path = resolve(dist, file);
            if (dirname(path) !== dist) throw Error("Unsafe output path");
            await unlink(path);
          }
        });
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
