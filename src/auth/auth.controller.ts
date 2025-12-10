import {
  Controller,
  Get,
  HttpStatus,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { Response } from 'express';
import { UserResponse } from './interfaces/user-response.interface';
import { ConfigService } from '@nestjs/config';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly configService: ConfigService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Google OAuth login',
    description:
      'Initiates Google OAuth2 authentication flow. Redirects to Google login page.',
  })
  @ApiResponse({ status: 302, description: 'Redirects to Google OAuth' })
  async googleAuth() {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint()
  async googleAuthCallback(
    @Req() req: { user: UserResponse },
    @Res() res: Response,
  ) {
    try {
      const user = req.user;
      const redirectUrl = this.configService.get<string>(
        'FRONTEND_DASHBOARD_URL',
      );
      res.redirect(`${redirectUrl}?accessToken=${user.accessToken}`);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: 'Authentication failed',
        data: {},
      });
    }
  }
}
