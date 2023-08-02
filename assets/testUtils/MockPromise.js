import { act } from 'react-dom/test-utils';
import { isFunction } from 'lodash';

export const withAct = callback => (...args) => {
  let result;

    //act(() => {
	result = callback(...args);
    //});

  return result;
};

export default class MockPromise {
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.promiseResolve = resolve;
      this.promiseReject = reject;
    });
  }

  resolve(...args) {
    this.promiseResolve(...args);

    return this;
  }

  reject(...args) {
    this.promiseReject(...args);

    return this;
  }

  then(...callbacks) {
    const mockCallbacks = callbacks.map(callback => withAct(callback));

    this.promise = this.promise.then(...mockCallbacks);

    return this;
  }

  catch(callback) {
    const mockCallback = withAct(callback);

    this.promise = this.promise.catch(mockCallback);

    return this;
  }

  finally(callback) {
    const mockCallback = withAct(callback);

    if (isFunction(this.promise.finally)) {
      this.promise = this.promise.finally(mockCallback);
    } else {
      this.promise = this.promise.then(mockCallback);
    }

    return this;
  }
}
