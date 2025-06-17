import {
  ConditionHandler,
  OutputHandler,
  RequestHandler,
  ScriptHandler,
} from "./common/handler";

console.log("Hello, TypeScript!");

const requestHandler = new RequestHandler(
  new ConditionHandler(
    (response) => response.data.userId == 1,
    new ScriptHandler(
      "console.log('true');  ({...input});",
      new OutputHandler(),
      new OutputHandler(),
      new OutputHandler()
    ),
    new ScriptHandler("console.log('false');  ({...input});", new OutputHandler(),new OutputHandler(),new OutputHandler()) // Condition is false
  ),
  undefined,
  new OutputHandler() // Request failed
);

requestHandler.run({
  url: "https://jsonplaceholder.typicode.com/posts/1",
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
});
