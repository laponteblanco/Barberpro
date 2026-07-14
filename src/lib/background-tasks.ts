import { after } from "next/server";

/**
 * Schedules `taskFn` to run after the current response is sent.
 *
 * Uses Next.js `after()` when available (Node.js / Vercel / Netlify with
 * waitUntil support).  If `after()` throws because the runtime does not
 * provide a `waitUntil` context (e.g. some serverless environments or local
 * dev edge-cases), the task is fired as a detached Promise so the calling
 * Server Action can still return a response to the client successfully.
 */
export function runInBackground(taskName: string, taskFn: () => Promise<void> | void) {
  const run = async () => {
    try {
      console.log(`[Background Task Started] ${taskName}`);
      await taskFn();
      console.log(`[Background Task Completed] ${taskName}`);
    } catch (error) {
      console.error(`[Background Task Failed] ${taskName}:`, error);
    }
  };

  try {
    after(run);
  } catch {
    // `after` is not supported in this runtime context — fire-and-forget
    // so the Server Action response is not blocked or broken.
    Promise.resolve().then(run).catch(() => {});
  }
}
