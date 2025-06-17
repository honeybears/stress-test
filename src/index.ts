import { IHandlerInput, OutputHandler, RequestHandler, ScriptHandler } from "./common/handler";

console.log("Hello, TypeScript!");

const parallelRequestHandler = new RequestHandler(
  new ScriptHandler((input: IHandlerInput) => {
    console.log(input.data);
    return input;
  }),
  undefined,
  new OutputHandler(),
  {
    concurrency: 100,
    timer: setTimeout(() => {}, 0), 
  }
);

console.log("Running 10 requests in parallel...");
parallelRequestHandler.run({
  url: "https://jsonplaceholder.typicode.com/posts/1",
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
});
