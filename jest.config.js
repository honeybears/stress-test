module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // 테스트 파일은 .test.ts 확장자를 가진 파일로 지정
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.ts$",
};
