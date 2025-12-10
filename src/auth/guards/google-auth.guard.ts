import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  // Optional: You can override the handleRequest method for custom error handling or response logic.
  // async handleRequest(err, user, info, context) {
  //   if (err || !user) {
  //     throw err || new UnauthorizedException();
  //   }
  //   return user;
  // }
}
