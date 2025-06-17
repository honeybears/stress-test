import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { v4 as uuidv4 } from "uuid";

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
  ): Promise<IHandlerOutput | IHandlerOutput[] | undefined>;
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
  ): Promise<IHandlerOutput | IHandlerOutput[] | undefined>;
}

export interface IOutputHandler extends IHandler {}

export interface IScriptHandler extends IHandler {
  script: (input: IHandlerInput) => unknown;
}

export interface IConditionHandler extends IHandler {
  condition: (input: IHandlerInput) => boolean;
}

export interface IRequestHandler extends IHandler {
  options?: {
    concurrency?: number;
    delay?: number;
    timer?: NodeJS.Timeout;
  };
}

export class RequestHandler extends Handler implements IRequestHandler {
  public options?: {
    concurrency?: number;
    delay?: number;
    timer: NodeJS.Timeout;
  };

  constructor(
    successHandler?: IHandler,
    failureHandler?: IHandler,
    errorHandler?: IHandler,
    options?: {
      concurrency?: number;
      delay?: number;
      timer: NodeJS.Timeout;
    }
  ) {
    super();
    this.successHandler = successHandler;
    this.failureHandler = failureHandler;
    this.errorHandler = errorHandler;
    this.options = options;
  }

  public async run(
    input: IHandlerInput
  ): Promise<IHandlerOutput | IHandlerOutput[] | undefined> {
    if (this.options) {
      const promises = [];
      for (let i = 0; i < (this.options.concurrency || 1); i++) {
        promises.push(axios.request(input));
      }

      try {
        const results = await Promise.all(promises);
        results.forEach((result) => {
          if (result.status >= 200 && result.status < 300) {
            this.successHandler?.run(result);
          }
          if (result.status >= 400 && result.status < 500) {
            this.failureHandler?.run(result);
          }
        });
      } catch (error: any) {
        return this.errorHandler?.run(error);
      }
    } else {
      try {
        const res = await axios.request(input);
        if (res.status >= 200 && res.status < 300) {
          return this.successHandler?.run(res);
        }
        if (res.status >= 400 && res.status < 500) {
          return this.failureHandler?.run(res);
        }
      } catch (err: any) {
        return this.errorHandler?.run(err);
      }
    }
  }
}

export class ScriptHandler extends Handler implements IScriptHandler {
  public script: (input: IHandlerInput) => unknown;

  constructor(
    script: (input: IHandlerInput) => unknown,
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

  public async run(
    input: IHandlerInput
  ): Promise<IHandlerOutput | IHandlerOutput[] | undefined> {
    try {
      const result = this.script(input);
      return this.successHandler?.run(result);
    } catch (error: any) {
      return this.errorHandler?.run(error);
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

  public async run(
    input: IHandlerInput
  ): Promise<IHandlerOutput | IHandlerOutput[] | undefined> {
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
  ): Promise<IHandlerOutput | IHandlerOutput[] | undefined> {
    if (Array.isArray(input)) {
      console.log("Parallel execution results:", input.length, "responses");
      input.forEach((item, index) => {
        console.log(`--- Response ${index + 1} ---`);
        if (item && item.data) {
          console.log("Status:", item.status);
          console.log("Body:", item.data);
        } else {
          console.log("Item:", item);
        }
        console.log("--------------------");
      });
    } else if (input && input.data) {
      console.log("--- Single execution result ---");
      console.log("Headers", input.headers);
      console.log("Body", input.data);
      console.log("Status", input.status);
      console.log("--------------------");
    } else {
      console.log("--- Other Input ---");
      console.log("Input", input);
      console.log("--------------------");
    }
    return input;
  }
}
