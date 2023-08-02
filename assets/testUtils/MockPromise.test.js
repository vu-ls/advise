import MockPromise from './MockPromise';

const testArgs = ['test-arg-1', 'test-arg-2', 'test-arg-3'];
const testCallback = () => {};

const newPromise = { test: 'test-result' };

let mockPromise;

describe('MockPromise', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockPromise = new MockPromise();
  });

  describe('constructor', () => {
    it('should create MockPromise instance', () => {
      expect(mockPromise).toBeDefined();
      expect(mockPromise).toBeInstanceOf(MockPromise);
    });

    it('should correctly set promise properties', () => {
      expect(mockPromise.promise).toBeInstanceOf(Promise);
      expect(mockPromise.promiseResolve).toBeInstanceOf(Function);
      expect(mockPromise.promiseReject).toBeInstanceOf(Function);
    });
  });

  describe('resolve', () => {
    it('should call promiseResolve', () => {
      const promiseResolveSpy = jest.spyOn(mockPromise, 'promiseResolve');

      const result = mockPromise.resolve(...testArgs);

      expect(result).toBe(mockPromise);

      expect(promiseResolveSpy).toBeCalledTimes(1);
      expect(promiseResolveSpy).toBeCalledWith(...testArgs);
    });
  });

  describe('reject', () => {
    it('should call promiseReject', () => {
      const promiseRejectSpy = jest.spyOn(mockPromise, 'promiseReject');

      const result = mockPromise.reject(...testArgs);

      expect(result).toBe(mockPromise);

      expect(promiseRejectSpy).toBeCalledTimes(1);
      expect(promiseRejectSpy).toBeCalledWith(...testArgs);
    });
  });

  describe('then', () => {
    it('should call promise.then', () => {
      const promiseThenSpy = jest.spyOn(mockPromise.promise, 'then');
      const testCallbacks = [() => {}, () => {}];
      const expectedCallbacks = testCallbacks.map(() => expect.any(Function));

      promiseThenSpy.mockReturnValue(newPromise);

      const result = mockPromise.then(...testCallbacks);

      expect(mockPromise.promise).toBe(newPromise);

      expect(result).toBe(mockPromise);

      expect(promiseThenSpy).toBeCalledTimes(1);
      expect(promiseThenSpy).toBeCalledWith(...expectedCallbacks);
    });
  });

  describe('catch', () => {
    it('should call promise.catch', () => {
      const promiseCatchSpy = jest.spyOn(mockPromise.promise, 'catch');

      promiseCatchSpy.mockReturnValue(newPromise);

      const result = mockPromise.catch(testCallback);

      expect(mockPromise.promise).toBe(newPromise);

      expect(result).toBe(mockPromise);

      expect(promiseCatchSpy).toBeCalledTimes(1);
      expect(promiseCatchSpy).toBeCalledWith(expect.any(Function));
    });
  });

  describe('finally', () => {
    it('should call promise.finally when promise.finally is function', () => {
      const promiseFinallySpy = jest.spyOn(mockPromise.promise, 'finally');

      promiseFinallySpy.mockReturnValue(newPromise);

      const result = mockPromise.finally(testCallback);

      expect(mockPromise.promise).toBe(newPromise);

      expect(result).toBe(mockPromise);

      expect(promiseFinallySpy).toBeCalledTimes(1);
      expect(promiseFinallySpy).toBeCalledWith(expect.any(Function));
    });

    it('should call promise.then when promise.finally is NOT function', () => {
      const promiseThenSpy = jest.spyOn(mockPromise.promise, 'then');

      promiseThenSpy.mockReturnValue(newPromise);

      mockPromise.promise.finally = null;

      const result = mockPromise.finally(testCallback);

      expect(mockPromise.promise).toBe(newPromise);

      expect(result).toBe(mockPromise);

      expect(promiseThenSpy).toBeCalledTimes(1);
      expect(promiseThenSpy).toBeCalledWith(expect.any(Function));
    });
  });
});
