import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiKeysService } from '../api-keys.service';
import { ApiKeyPermission } from '../../entities/api-key.entity';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const apiKeyRecord = await this.apiKeysService.validateApiKey(apiKey);

    if (!apiKeyRecord) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKeyRecord.isExpired()) {
      throw new UnauthorizedException('API key has expired');
    }

    await this.apiKeysService.updateLastUsed(apiKeyRecord.id);

    request.user = apiKeyRecord.user;
    request.permissions = apiKeyRecord.permissions;
    request.authMethod = 'api_key';

    return true;
  }
}

@Injectable()
export class ApiKeyPermissionGuard implements CanActivate {
  constructor(private requiredPermissions: ApiKeyPermission[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (request.authMethod === 'jwt') {
      return true;
    }

    const userPermissions = request.permissions || [];

    const hasPermission = this.requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${this.requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
