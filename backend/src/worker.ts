import { startWorker } from "./workers/email.worker";

console.log("Starting Email Scheduler Worker...");
startWorker();
