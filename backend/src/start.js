/**
 * Startup wrapper: logs any load/startup error so App Platform logs show the real cause
 * (e.g. missing mysql2, bad DB config) instead of a generic "application could not be loaded".
 */
async function main() {
  try {
    await import("./server.js");
  } catch (err) {
    console.error("Startup failed:", err?.message || err);
    if (err?.stack) console.error(err.stack);
    if (err?.code === "ERR_MODULE_NOT_FOUND" || err?.message?.includes("Cannot find module")) {
      console.error("Tip: Ensure package.json includes the missing dependency and redeploy (clear build cache if needed).");
    }
    process.exit(1);
  }
}
main();
