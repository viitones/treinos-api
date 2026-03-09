import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

export async function swaggerRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/swagger.json",
    schema: {
      hide: true,
    },
    handler: async () => {
      return app.swagger();
    }
  });
}