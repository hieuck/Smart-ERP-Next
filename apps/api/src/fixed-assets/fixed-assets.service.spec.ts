import { Test, TestingModule } from '@nestjs/testing';
import { FixedAssetsService } from './services/fixed-assets.service';

describe('FixedAssetsService', () => {
  let service: FixedAssetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FixedAssetsService],
    }).compile();

    service = module.get<FixedAssetsService>(FixedAssetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});