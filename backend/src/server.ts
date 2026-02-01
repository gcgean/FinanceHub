import { env } from "./lib/env";
import { buildApp } from "./index";

const app = buildApp();

app.listen({ port: env.PORT, host: env.HOST })
  .then((address) => {
    app.log.info({ address }, "server listening");
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

