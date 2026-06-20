import { after } from "next/server";

export function runInBackground(taskName: string, taskFn: () => Promise<void> | void) {
  after(async () => {
    try {
      console.log(`[Background Task Started] ${taskName}`);
      await taskFn();
      console.log(`[Background Task Completed] ${taskName}`);
    } catch (error) {
      console.error(`[Background Task Failed] ${taskName}:`, error);
    }
  });
}
