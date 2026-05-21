import * as types from '../src';

describe('types package index exports', () => {
  it('loads the package barrel for runtime-safe enum/value exports', () => {
    expect(types).toBeDefined();
  });
});
