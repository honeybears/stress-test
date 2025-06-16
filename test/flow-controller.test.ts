import { Flow, FlowController } from "../src/core/flow-controller";
import { MockRequest, MockResponse } from "./mocks";

describe("FlowController", () => {
  // 시나리오 1: 두 개의 Flow가 성공적으로 연속 실행되는 경우
  test("should execute a chain of flows successfully", async () => {
    // Mock 콜백 함수들
    const firstFlowSuccess = jest.fn();
    const secondFlowSuccess = jest.fn();

    // 첫 번째 요청 Mock
    const firstRequest = new MockRequest("/api/first");
    // 두 번째 요청 Mock
    const secondRequest = new MockRequest("/api/second");

    // Flow 체인 생성 (두 번째 Flow -> 첫 번째 Flow)
    const secondFlow = new Flow(secondRequest, {
      onSuccess: secondFlowSuccess,
    });
    const firstFlow = new Flow(firstRequest, {
      next: secondFlow,
      onSuccess: firstFlowSuccess,
    });

    const controller = new FlowController(firstFlow);
    await controller.execute();

    // onSuccess 콜백이 각각 1번씩 호출되었는지 확인
    expect(firstFlowSuccess).toHaveBeenCalledTimes(1);
    expect(secondFlowSuccess).toHaveBeenCalledTimes(1);
  });

  // 시나리오 2: Flow 간 데이터(헤더/바디) 의존성이 올바르게 처리되는 경우
  test("should pass data between flows correctly", async () => {
    // 첫 번째 Flow가 반환할 응답 설정
    const firstResponseData = { userId: "123" };
    const firstResponseHeaders = { "x-auth-token": "dummy-token" };

    // 첫 번째 요청 Mock. 정해진 응답을 반환하도록 핸들러 설정
    const firstRequest = new MockRequest("/api/auth");
    firstRequest.setHandler(
      async () => new MockResponse(200, firstResponseData, firstResponseHeaders)
    );

    // 두 번째 요청 Mock
    const secondRequest = new MockRequest("/api/data");

    // Flow 체인 생성
    const secondFlow = new Flow(secondRequest, {
      dependsHeaders: { "x-auth-token": "" }, // 이 헤더가 필요함
      dependsBody: { userId: "" }, // 이 바디 데이터가 필요함
    });
    const firstFlow = new Flow(firstRequest, { next: secondFlow });

    const controller = new FlowController(firstFlow);
    await controller.execute();

    // 두 번째 요청의 헤더와 바디에 첫 번째 응답의 데이터가 포함되었는지 확인
    console.log(secondRequest.body);
    console.log(secondRequest.headers);
    expect(secondRequest.body?.userId).toBe("123");
    expect(secondRequest.headers["x-auth-token"]).toBe("dummy-token");
  });

  // 시나리오 3: Flow 실행 중 에러가 발생하여 멈추는 경우
  test("should stop execution on flow failure", async () => {
    // 첫 번째 요청은 실패하도록 설정 (500 에러)
    const firstRequest = new MockRequest("/api/error");
    firstRequest.setHandler(
      async () => new MockResponse(500, { error: "Internal Server Error" })
    );

    const secondRequest = new MockRequest("/api/never-called");

    // Mock 콜백
    const firstFlowFailure = jest.fn();
    const secondFlowSuccess = jest.fn(); // 이 함수는 호출되면 안 됨

    // Flow 체인 생성
    const secondFlow = new Flow(secondRequest, {
      onSuccess: secondFlowSuccess,
    });
    const firstFlow = new Flow(firstRequest, {
      next: secondFlow,
      onFailure: firstFlowFailure,
    });

    const controller = new FlowController(firstFlow);
    await controller.execute();

    // onFailure가 1번 호출되었는지 확인
    expect(firstFlowFailure).toHaveBeenCalledTimes(1);
    // 두 번째 Flow의 onSuccess는 호출되지 않았는지 확인
    expect(secondFlowSuccess).not.toHaveBeenCalled();
  });
});
