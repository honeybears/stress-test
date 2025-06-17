import axios from "axios";
import {
  ConditionHandler,
  IHandler,
  IHandlerInput,
  OutputHandler,
  RequestHandler,
  ScriptHandler,
} from "../src/common/handler";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Request Chain Handlers", () => {
  let successHandler: IHandler;
  let failureHandler: IHandler;
  let errorHandler: IHandler;

  beforeEach(() => {
    successHandler = {
      id: "success",
      run: jest.fn().mockImplementation((input) => Promise.resolve(input)),
      setSuccessHandler: jest.fn(),
      setFailureHandler: jest.fn(),
      setErrorHandler: jest.fn(),
      getSuccessHandler: jest.fn(),
      getFailureHandler: jest.fn(),
      getErrorHandler: jest.fn(),
    };
    failureHandler = {
      id: "failure",
      run: jest.fn().mockImplementation((input) => Promise.resolve(input)),
      setSuccessHandler: jest.fn(),
      setFailureHandler: jest.fn(),
      setErrorHandler: jest.fn(),
      getSuccessHandler: jest.fn(),
      getFailureHandler: jest.fn(),
      getErrorHandler: jest.fn(),
    };
    errorHandler = {
      id: "error",
      run: jest.fn().mockImplementation((input) => Promise.resolve(input)),
      setSuccessHandler: jest.fn(),
      setFailureHandler: jest.fn(),
      setErrorHandler: jest.fn(),
      getSuccessHandler: jest.fn(),
      getFailureHandler: jest.fn(),
      getErrorHandler: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("RequestHandler", () => {
    it("should call successHandler on 2xx status", async () => {
      const response = { data: { message: "success" }, status: 200 };
      mockedAxios.request.mockResolvedValue(response);

      const requestHandler = new RequestHandler(
        successHandler,
        failureHandler,
        errorHandler
      );
      await requestHandler.run({} as IHandlerInput);

      expect(successHandler.run).toHaveBeenCalledWith(response);
      expect(failureHandler.run).not.toHaveBeenCalled();
      expect(errorHandler.run).not.toHaveBeenCalled();
    });

    it("should call failureHandler on 4xx status", async () => {
      const response = { data: { message: "failure" }, status: 400 };
      mockedAxios.request.mockResolvedValue(response);

      const requestHandler = new RequestHandler(
        successHandler,
        failureHandler,
        errorHandler
      );
      await requestHandler.run({} as IHandlerInput);

      expect(failureHandler.run).toHaveBeenCalledWith(response);
      expect(successHandler.run).not.toHaveBeenCalled();
      expect(errorHandler.run).not.toHaveBeenCalled();
    });

    it("should call errorHandler on request error", async () => {
      const error = { response: { data: { message: "error" } } };
      mockedAxios.request.mockRejectedValue(error);

      const requestHandler = new RequestHandler(
        successHandler,
        failureHandler,
        errorHandler
      );
      await requestHandler.run({} as IHandlerInput);

      expect(errorHandler.run).toHaveBeenCalledWith(error);
      expect(successHandler.run).not.toHaveBeenCalled();
      expect(failureHandler.run).not.toHaveBeenCalled();
    });
  });

  describe("ScriptHandler", () => {
    it("should execute script and call successHandler with the result", async () => {
      const script = (input: IHandlerInput) => ({ ...input, modified: true });
      const scriptHandler = new ScriptHandler(
        script,
        successHandler,
        errorHandler
      );
      const input = { data: { initial: true } };

      await scriptHandler.run(input as any);

      expect(successHandler.run).toHaveBeenCalledWith(
        expect.objectContaining({
          modified: true,
        })
      );
    });

    it("should call errorHandler on script error", async () => {
      const script = (input: IHandlerInput) => {
        throw new Error("script error");
      };
      const scriptHandler = new ScriptHandler(
        script,
        successHandler,
        failureHandler,
        errorHandler
      );
      const input = { data: { initial: true } };

      await scriptHandler.run(input as any);

      expect(errorHandler.run).toHaveBeenCalled();
      expect(successHandler.run).not.toHaveBeenCalled();
    });
  });

  describe("ConditionHandler", () => {
    it("should call successHandler when condition is true", async () => {
      const condition = (input: any) => input.data.shouldSucceed;
      const conditionHandler = new ConditionHandler(
        condition,
        successHandler,
        failureHandler,
        errorHandler
      );
      const input = { data: { shouldSucceed: true } };

      await conditionHandler.run(input as any);

      expect(successHandler.run).toHaveBeenCalledWith(input);
      expect(failureHandler.run).not.toHaveBeenCalled();
    });

    it("should call failureHandler when condition is false", async () => {
      const condition = (input: any) => input.data.shouldSucceed;
      const conditionHandler = new ConditionHandler(
        condition,
        successHandler,
        failureHandler,
        errorHandler
      );
      const input = { data: { shouldSucceed: false } };

      await conditionHandler.run(input as any);

      expect(failureHandler.run).toHaveBeenCalledWith(input);
      expect(successHandler.run).not.toHaveBeenCalled();
    });
  });

  describe("Complex Chain", () => {
    it("should execute a complex chain of handlers correctly", async () => {
      // Final handler
      const finalSuccessHandler = new OutputHandler();
      const finalSuccessHandlerRunSpy = jest.spyOn(finalSuccessHandler, "run");

      // Script handler to modify data
      const scriptHandler = new ScriptHandler(
        (input: IHandlerInput) => ({ ...input }),
        finalSuccessHandler // The success handler is now finalSuccessHandler
      );
      const scriptHandlerRunSpy = jest.spyOn(scriptHandler, "run");

      // Condition handler to check the response from the first request
      const conditionHandler = new ConditionHandler(
        (input: any) => input.data.needsProcessing,
        scriptHandler
      );
      const conditionHandlerRunSpy = jest.spyOn(conditionHandler, "run");

      // First request
      const requestHandler1 = new RequestHandler(conditionHandler);

      // Mock API responses
      mockedAxios.request.mockResolvedValueOnce({
        data: { needsProcessing: true, hello: "world" },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      });

      await requestHandler1.run({ url: "/initial", method: "get" } as any);

      expect(mockedAxios.request).toHaveBeenCalledTimes(1);
      expect(conditionHandlerRunSpy).toHaveBeenCalled();
      expect(scriptHandlerRunSpy).toHaveBeenCalled();
      expect(finalSuccessHandlerRunSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { needsProcessing: true, hello: "world" },
        })
      );
    });
  });
});
