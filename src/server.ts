import { app } from "./app.js";

app
  .listen({
    port: +(process.env.PORT ?? 3001),
    host: '0.0.0.0'
  })
  .then(() => {
    console.log(`🚀 Server running on port ${process.env.PORT ?? 3001}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
