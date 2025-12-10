import { Module, forwardRef } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { Wallet } from 'src/entities/wallet.entity';
import { Transaction } from 'src/entities/transaction.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CombinedAuthGuard } from 'src/common/guard/combined-auth.guard';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ApiKeyGuard } from 'src/api-keys/guards/api-key.guard';
import { AuthModule } from 'src/auth/auth.module';
import { ApiKeysModule } from 'src/api-keys/api-keys.module';
import { PaystackModule } from 'src/paystack/paystack.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction]),
    forwardRef(() => AuthModule),
    forwardRef(() => ApiKeysModule),
    forwardRef(() => PaystackModule),
  ],
  controllers: [WalletsController],
  providers: [WalletsService, CombinedAuthGuard, AuthGuard, ApiKeyGuard],
  exports: [WalletsService],
})
export class WalletsModule {}
