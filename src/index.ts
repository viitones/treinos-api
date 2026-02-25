import "dotenv/config";

import Fastify from "fastify";
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { z } from 'zod/v4';

const app = Fastify({
  logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler)


app.withTypeProvider<ZodTypeProvider>().route({
  method: 'GET',
  url: '/',
  schema: {
    description: "Hello world endpoint",
    tags: ['example'],
    response: {
      200: z.object({
        message: z.string(),
      })
    }
  },
  handler: () => {
    return {
      message: "Hello world!"
    }
  }
});

try {
  await app.listen({ port: Number(process.env.PORT ?? 3000) });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
