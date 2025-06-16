import { IBody, IHeaders, IRequest, IResponse } from "../src/common/types";

// --- Mock Response ---
export class MockResponse<T> implements IResponse<T> {
  readonly status: number;
  readonly data?: T;
  readonly headers: IHeaders;
  readonly request?: IRequest;

  constructor(status: number, data?: T, headers: IHeaders = {}) {
    this.status = status;
    this.data = data;
    this.headers = headers;
  }

  isSuccess(): boolean {
    return this.status >= 200 && this.status < 300;
  }
}

// --- Mock Request ---
export type MockRequestHandler<T> = (req: IRequest) => Promise<IResponse<T>>;

export class MockRequest implements IRequest {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers: IHeaders;
  body?: IBody;

  private handler: MockRequestHandler<any>;

  constructor(
    url: string,
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET",
    body?: IBody,
    handler?: MockRequestHandler<any>
  ) {
    this.url = url;
    this.method = method;
    this.headers = {};
    this.body = body;
    // 기본 핸들러: 항상 200 OK 응답
    this.handler =
      handler ?? (async (req) => new MockResponse(200, { message: "ok" }));
  }

  // 테스트에서 응답을 조작하기 위한 메서드
  setHandler<T>(handler: MockRequestHandler<T>) {
    this.handler = handler;
  }

  async send<T>(): Promise<IResponse<T>> {
    return this.handler(this);
  }
}
