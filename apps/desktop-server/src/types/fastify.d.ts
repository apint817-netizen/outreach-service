import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    db: any;
    httpErrors: any;
  }
}
