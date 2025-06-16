import { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { RequestChainHandler, IRequest, IHandler } from '../src/common/request-chain';

describe('RequestChainHandler', () => {
  // Mock AxiosResponse 생성
  const createMockResponse = (data: any): AxiosResponse => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig
  });

  // Mock Request 생성
  const createMockRequest = (response: AxiosResponse): IRequest => ({
    run: jest.fn().mockResolvedValue(response)
  });

  // Mock Handler 생성
  const createMockHandler = (nextRequest?: IRequest): IHandler => ({
    request: nextRequest,
    run: jest.fn().mockImplementation(async (input) => input)
  });

  it('단일 요청을 실행할 수 있어야 합니다', async () => {
    const mockResponse = createMockResponse({ message: 'success' });
    const mockRequest = createMockRequest(mockResponse);
    const chainHandler = new RequestChainHandler(mockRequest);

    const result = await chainHandler.run({} as AxiosRequestConfig);

    expect(result).toEqual(mockResponse);
    expect(mockRequest.run).toHaveBeenCalledTimes(1);
  });

  it('체인 요청을 실행할 수 있어야 합니다', async () => {
    const mockResponse1 = createMockResponse({ step: 1 });
    const mockResponse2 = createMockResponse({ step: 2 });
    const mockResponse3 = createMockResponse({ step: 3 });

    const request3 = createMockRequest(mockResponse3);
    const handler2 = createMockHandler(request3);
    const request2 = createMockRequest(mockResponse2);
    request2.handler = handler2;
    const handler1 = createMockHandler(request2);
    const request1 = createMockRequest(mockResponse1);
    request1.handler = handler1;

    const chainHandler = new RequestChainHandler(request1);

    const result = await chainHandler.run({} as AxiosRequestConfig);

    expect(result).toEqual(mockResponse3);
    expect(request1.run).toHaveBeenCalledTimes(1);
    expect(handler1.run).toHaveBeenCalledTimes(1);
    expect(request2.run).toHaveBeenCalledTimes(1);
    expect(handler2.run).toHaveBeenCalledTimes(1);
    expect(request3.run).toHaveBeenCalledTimes(1);
  });

  it('요청이 없는 경우 undefined를 반환해야 합니다', async () => {
    const chainHandler = new RequestChainHandler();
    const result = await chainHandler.run({} as AxiosRequestConfig);
    expect(result).toBeUndefined();
  });

  it('handler가 없는 경우 첫 번째 응답을 반환해야 합니다', async () => {
    const mockResponse = createMockResponse({ message: 'no handler' });
    const mockRequest = createMockRequest(mockResponse);
    const chainHandler = new RequestChainHandler(mockRequest);

    const result = await chainHandler.run({} as AxiosRequestConfig);

    expect(result).toEqual(mockResponse);
    expect(mockRequest.run).toHaveBeenCalledTimes(1);
  });
}); 