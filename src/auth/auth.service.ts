import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { UserResponse } from './interfaces/user-response.interface';
import { WalletsService } from 'src/wallets/wallets.service';

@Injectable()
export class AuthService {
  private jwtExpiresIn: string;
  private jwtRefeshExpiresIn: string;

  constructor(
    private readonly usersService: UserService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly walletsService: WalletsService,
  ) {
    this.jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN')!;
    this.jwtRefeshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
    )!;
  }

  async validateOrCreateUser(user: {
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
    googleId: string;
  }): Promise<UserResponse> {
    const existingUser = await this.usersService.findByEmail(user.email);

    if (existingUser) {
      const { accessToken, refreshToken } =
        await this.generateJwtToken(existingUser);
      return { ...existingUser, accessToken, refreshToken };
    } else {
      const newUser = await this.usersService.createUser({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
        googleId: user.googleId,
      });

      await this.walletsService.createWallet(newUser.id);

      const { accessToken, refreshToken } =
        await this.generateJwtToken(newUser);

      return { ...newUser, accessToken, refreshToken };
    }
  }

  private async generateJwtToken(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payloadBase = {
      id: user.id,
      email: user.email,
      googleId: user.googleId,
    };

    const accessTokenExpiry = this.convertToSeconds(this.jwtExpiresIn);
    const refreshTokenExpiry = this.convertToSeconds(this.jwtRefeshExpiresIn);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payloadBase, {
        expiresIn: accessTokenExpiry,
      }),
      this.jwtService.signAsync(payloadBase, {
        expiresIn: refreshTokenExpiry,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private convertToSeconds(time: string): number {
    const unit = time.slice(-1);
    const value = parseInt(time.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return parseInt(time);
    }
  }
}
