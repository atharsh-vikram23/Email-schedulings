import app from "./app";
import { startWorker } from "./workers/email.worker";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in lightweight mode (No Docker)`);
  
  // Start the email worker in the same process for easier local development
  startWorker();
});
