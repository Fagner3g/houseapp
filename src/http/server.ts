import fastify from "fastify";

const app = fastify();

app.get("/", () => {
  return { hello: "world" };
});

app
  .listen({
    port: 3333,
    host: "0.0.0.0",
  })
  .then((address) => {
    console.log(`Server listening at ${address}`);
  });
