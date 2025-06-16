import { AxiosRequestConfig, AxiosResponse } from "axios";
import { Script, createContext } from "vm";

export type IRequestInput = AxiosRequestConfig;
export type IHandlerOutput = AxiosResponse;
export type IHandlerInput = AxiosResponse;

export interface IHandler {
  request?: IRequest;
  script?: string;
  run(input: IHandlerInput): Promise<IHandlerOutput>;
}

export interface IRequest {
  handler?: IHandler;
  run(input: IRequestInput): Promise<IHandlerOutput>;
}

export interface IRequestChainHandler {
  request?: IRequest;
  run(input: IRequestInput): Promise<IHandlerOutput | IHandlerInput | undefined>;
}

export class RequestChainHandler implements IRequestChainHandler {
  public request?: IRequest;

  constructor(request?: IRequest) {
    this.request = request;
  }

  private async executeScript(script: string, input: IHandlerInput): Promise<IHandlerOutput> {
    const context = createContext({
      input,
      console,
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
    });

    const vmScript = new Script(script);
    const result = await new Promise((resolve, reject) => {
      try {
        const output = vmScript.runInContext(context);
        resolve(output);
      } catch (error) {
        reject(error);
      }
    });

    return result as IHandlerOutput;
  }

  public async run(
    input: IRequestInput
  ): Promise<IHandlerOutput | IHandlerInput | undefined> {
    const response = await this.request?.run(input);
    if (this.request?.handler && response) {
      const handler = this.request.handler;
      
      // 스크립트가 있는 경우 실행
      if (handler.script) {
        const scriptResult = await this.executeScript(handler.script, response);
        const nextRequest = handler.request;
        const nextRequestInput = scriptResult;
        this.request = nextRequest;
        return this.run(nextRequestInput);
      }
      
      // 스크립트가 없는 경우 기존 로직 실행
      const nextRequest = handler.request;
      const nextRequestInput = await handler.run(response);
      this.request = nextRequest;
      return this.run(nextRequestInput);
    }
    return response;
  }
}
