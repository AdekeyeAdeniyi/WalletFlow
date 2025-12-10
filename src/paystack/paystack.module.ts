import { Module, forwardRef } from '@nestjs/common';
import { PaystackService } from './paystack.service';
import { PaystackController } from './paystack.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaystackTransaction } from 'src/entities/paystack-transaction.entity';
import { WalletsModule } from 'src/wallets/wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaystackTransaction]),
    forwardRef(() => WalletsModule),
  ],
  controllers: [PaystackController],
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaystackModule {}
