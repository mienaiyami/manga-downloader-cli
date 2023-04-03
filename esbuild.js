import { build } from "esbuild";

build({
    entryPoints: ["./ts/index.ts"],
    bundle: true,
    outfile: "index.js",
    platform: "node",
    target: ["node18"],
    external: ["canvas"],
    tsconfig: "./tsconfig.json",
}).catch(() => process.exit(1));
