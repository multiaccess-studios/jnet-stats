import path from "node:path";
import tailwindcss from "bun-plugin-tailwind";

const result = await Bun.build({
  entrypoints: ["./src/index.html"],
  outdir: "./dist",
  target: "browser",
  sourcemap: "linked",
  minify: true,
  env: "BUN_PUBLIC_*",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [tailwindcss],
  throw: false,
});

for (const log of result.logs) {
  const message = log.message ?? log.toString();
  if (log.level === "error") {
    console.error(message);
  } else if (log.level === "warning") {
    console.warn(message);
  } else {
    console.log(message);
  }
}

if (!result.success) {
  throw new Error("Build failed");
}

const files = result.outputs
  .filter((output) => output.path)
  .map((output) => path.relative(process.cwd(), output.path));

console.log(
  `Built ${files.length} file${files.length === 1 ? "" : "s"}:\n${files.map((file) => `  • ${file}`).join("\n")}`,
);
