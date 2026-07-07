import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getMetadataStorage } from 'class-validator';
import { ApprovalsController } from './approvals.controller';
import { ApprovalRequestDto } from './dto/approval-request.dto';

const readSource = () =>
  readFileSync(resolve(__dirname, './approvals.controller.ts'), 'utf-8');

describe('ApprovalsController issue #397', () => {
  describe('import paths', () => {
    const source = readSource();

    it('imports JwtAuthGuard from common guards path', () => {
      expect(source).toContain("import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';");
    });

    it('imports CurrentUser from common decorators path', () => {
      expect(source).toContain("import { CurrentUser } from '../common/decorators/current-user.decorator';");
    });
  });

  describe('ParseUUIDPipe on route params', () => {
    const source = readSource();

    it('uses ParseUUIDPipe for rule :id params', () => {
      expect(source).toMatch(/@Param\('id',\s*ParseUUIDPipe\)/);
    });

    it('uses ParseUUIDPipe for request :requestId params', () => {
      expect(source).toMatch(/@Param\('requestId',\s*ParseUUIDPipe\)/);
    });

    it('uses ParseUUIDPipe for request :id param', () => {
      expect(source).toMatch(/getRequest\([\s\S]*?@Param\('id',\s*ParseUUIDPipe\)/);
    });
  });

  describe('ApprovalRequestDto validation decorators', () => {
    it('has class-validator decorators on ApprovalRequestDto', () => {
      const storage = getMetadataStorage();
      const metadatas = storage.getTargetValidationMetadatas(ApprovalRequestDto, null, false, false);
      const properties = new Set(metadatas.map((m: any) => m.propertyName));

      expect(properties).toContain('documentType');
      expect(properties).toContain('documentId');
      expect(properties).toContain('documentAmount');
      expect(properties).toContain('approverIds');
    });
  });
});
