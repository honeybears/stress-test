import { AxiosRequestConfig, AxiosResponse } from "axios";

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

  public async run(
    input: IRequestInput
  ): Promise<IHandlerOutput | IHandlerInput | undefined> {
    const response = await this.request?.run(input);
    if (this.request?.handler && response) {
      const nextRequest = this.request.handler.request;
      const nextRequestInput = await this.request.handler.run(response);
      this.request = nextRequest;
      return this.run(nextRequestInput);
    }
    return response;
  }
}
