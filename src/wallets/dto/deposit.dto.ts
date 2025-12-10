import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({
    description: 'Amount to deposit (minimum 100 NGN)',
    example: 1000,
    minimum: 100,
  })
  @IsNumber()
  @Min(100)
  amount: number;
}
