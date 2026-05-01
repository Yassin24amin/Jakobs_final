import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Nightly EWMA demand profile update — runs at 4:00 AM every day.
crons.cron(
  "nightly demand update",
  "0 4 * * *",
  internal["im_forecast"].nightlyCron.runNightlyUpdate,
  {}
);

// Nightly expiry check — runs at 4:05 AM every day.
// Zeros out expired stock, logs waste, creates smart reorders for expiring-soon items.
crons.cron(
  "nightly expiry check",
  "5 4 * * *",
  internal.im_expiry.checkExpiry,
  {}
);

export default crons;
