import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { v4 as uuidv4 } from "uuid";
import { createContext, Script } from "vm";

export type IRequestInput = AxiosRequestConfig;
export type IHandlerOutput = AxiosResponse;
export type IHandlerInput = AxiosRequestConfig | AxiosResponse;
export type IOutputHandlerInput = any;

export interface IHandler {
  id: string;
  setSuccessHandler(handler: IHandler): this;
  setFailureHandler(handler: IHandler): this;
  setErrorHandler(handler: IHandler): this;
  getSuccessHandler(): IHandler | undefined;
  getFailureHandler(): IHandler | undefined;
  getErrorHandler(): IHandler | undefined;
  run(
    input: IHandlerInput | IOutputHandlerInput
  ): Promise<IHandlerOutput | undefined>;
}

export abstract class Handler implements IHandler {
  public id: string = uuidv4();
  protected successHandler?: IHandler;
  protected failureHandler?: IHandler;
  protected errorHandler?: IHandler;

  public setSuccessHandler(handler: IHandler): this {
    this.successHandler = handler;
    return this;
  }

  public setFailureHandler(handler: IHandler): this {
    this.failureHandler = handler;
    return this;
  }

  public setErrorHandler(handler: IHandler): this {
    this.errorHandler = handler;
    return this;
  }

  public getSuccessHandler(): IHandler | undefined {
    return this.successHandler;
  }

  public getFailureHandler(): IHandler | undefined {
    return this.failureHandler;
  }

  public getErrorHandler(): IHandler | undefined {
    return this.errorHandler;
  }

    public abstract run(
    input: IHandlerInput | IOutputHandlerInput
  ): Promise<IHandlerOutput | undefined>;
}

export interface IOutputHandler extends IHandler {}

export interface IScriptHandler extends IHandler {
  script: string;
}

export interface IConditionHandler extends IHandler {
  condition: (input: IHandlerInput) => boolean;
}

export interface IRequestHandler extends IHandler {}

export class RequestHandler extends Handler implements IRequestHandler {
  constructor(
    successHandler?: IHandler,
    failureHandler?: IHandler,
    errorHandler?: IHandler
  ) {
    super();
    this.successHandler = successHandler;
    this.failureHandler = failureHandler;
    this.errorHandler = errorHandler;
  }

  public async run(input: IHandlerInput): Promise<IHandlerOutput | undefined> {
    const response = await axios
      .request(input)
      .then((res) => {
        if (res.status >= 200 && res.status < 300) {
          return this.successHandler?.run(res);
        }
        if (res.status >= 400 && res.status < 500) {
          return this.failureHandler?.run(res);
        }
      })
      .catch((err) => {
        return this.errorHandler?.run(err);
      });
    return response;
  }
}

export class ScriptHandler extends Handler implements IScriptHandler {
  public script: string;

  constructor(
    script: string,
    successHandler?: IHandler,
    failureHandler?: IHandler,
    errorHandler?: IHandler
  ) {
    super();
    this.script = script;
    this.successHandler = successHandler;
    this.failureHandler = failureHandler;
    this.errorHandler = errorHandler;
  }

  public async run(input: IHandlerInput): Promise<IHandlerOutput | undefined> {
    const context = createContext({
      input,
      console,
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
    });

    try {
      const vmScript = new Script(this.script);
      const result = vmScript.runInContext(context);
      return this.successHandler?.run(result);
    } catch (error) {
      return this.errorHandler?.run(error as any);
    }
  }
}

export class ConditionHandler extends Handler implements IConditionHandler {
  public condition: (input: IHandlerInput) => boolean;

  constructor(
    condition: (input: IHandlerInput) => boolean,
    successHandler?: IHandler,
    failureHandler?: IHandler,
    errorHandler?: IHandler
  ) {
    super();
    this.condition = condition;
    this.successHandler = successHandler;
    this.failureHandler = failureHandler;
    this.errorHandler = errorHandler;
  }

  public async run(input: IHandlerInput): Promise<IHandlerOutput | undefined> {
    try {
      if (this.condition(input)) {
        return this.successHandler?.run(input);
      }
      return this.failureHandler?.run(input);
    } catch (error) {
      return;
    }
  }
}

export class OutputHandler extends Handler implements IOutputHandler {
  constructor(successHandler?: IHandler) {
    super();
    this.successHandler = successHandler;
  }

  public async run(
    input: IOutputHandlerInput
  ): Promise<IHandlerOutput | undefined> {
    if (input["headers"] && input["status"] || input["body"]) {
      console.log("Headers", input.headers);
      console.log("Body", input.data);
      console.log("Status", input.status);
    }
    else{
      console.log("Input", input);
    }
    return input;
  }
}
