import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { ApiKeyGuard } from '../../api-keys/guards/api-key.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class CombinedAuthGuard implements CanActivate {
  constructor(
    private jwtAuthGuard: AuthGuard,
    private apiKeyGuard: ApiKeyGuard,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    if (request.headers['x-api-key']) {
      return this.apiKeyGuard.canActivate(context);
    }

    if (
      request.headers.authorization &&
      request.headers.authorization.startsWith('Bearer ')
    ) {
      request.authMethod = 'jwt';
      return this.jwtAuthGuard.canActivate(context);
    }

    throw new HttpException(
      'No valid authentication method provided',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
