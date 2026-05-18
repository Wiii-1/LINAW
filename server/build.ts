const result = await Bun.build({
  entrypoints: ["./server.ts"],
  outdir: "./dist",
  target: "node", // or 'bun' for Bun-specific runtime features
  minify: true,
  sourcemap: "linked",
});

if (!result.success) {
  console.error("Build failed:", result.logs);
  process.exit(1);
}
