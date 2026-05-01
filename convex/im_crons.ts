import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Nightly EWMA demand profile update — runs at 4:00 AM every day.
// If no sales were recorded, it's a no-op.
crons.cron(
  "nightly demand update",
  "0 4 * * *", // 4 AM daily
  internal["im_forecast"].nightlyCron.runNightlyUpdate,
  {}
);

export default crons;
