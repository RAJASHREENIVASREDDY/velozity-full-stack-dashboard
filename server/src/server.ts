import http from "http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { initSockets } from "./sockets/index.js";
import { startOverdueJob } from "./jobs/overdue.job.js";

const app = createApp();
const server = http.createServer(app);
initSockets(server);

server.listen(env.PORT, () => {
  console.log(`API listening on :${env.PORT} (env=${env.NODE_ENV})`);
  startOverdueJob();
});

export { app, server };
