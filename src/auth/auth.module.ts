import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './strategies/google.strategy';
import { UserModule } from 'src/user/user.module';
import { WalletsModule } from 'src/wallets/wallets.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN'),
        },
      }),
    }),
    UserModule,
    forwardRef(() => WalletsModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
