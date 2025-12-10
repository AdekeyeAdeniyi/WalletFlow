import { Module, forwardRef } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from 'src/entities/api-key.entity';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey]), forwardRef(() => AuthModule)],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, AuthGuard],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
