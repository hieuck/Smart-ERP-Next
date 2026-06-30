import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) return false;

    const result = await this.apiKeyService.validateKey(apiKey);
    if (!result) return false;

    request.tenantId = result.tenantId;
    request.apiKeyId = result.keyId;
    return true;
  }
}
