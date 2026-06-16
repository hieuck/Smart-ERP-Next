import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

describe('SettingsController', () => {
  it('can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [SettingsService],
    }).compile();
    expect(module.get<SettingsController>(SettingsController)).toBeDefined();
  });
});
