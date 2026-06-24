import { AnalyticsController } from './analytics.controller';

describe('AnalyticsController', () => {
  let ctrl: AnalyticsController;

  beforeEach(() => {
    ctrl = new AnalyticsController();
  });

  it('should be defined', () => {
    expect(ctrl).toBeDefined();
  });
});
