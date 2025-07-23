import fastify from "fastify";

const app = fastify();

app.get("/", async () => {
	return { hello: "world" };
});

async function start() {
	try {
		const address = await app.listen({
			port: 3333,
			host: "0.0.0.0",
		});
		console.log(`Server listening at ${address}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

start();
