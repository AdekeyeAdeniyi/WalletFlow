import { IsString, IsNumber, Min, Max, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({
    description: 'Recipient wallet number (format: WLT + 12 digits)',
    example: 'WLT123456789012',
    pattern: '^WLT\\d{12}$',
  })
  @IsString()
  @Matches(/^WLT\d{12}$/, {
    message: 'Invalid wallet number format',
  })
  wallet_number: string;

  @ApiProperty({
    description: 'Amount to transfer (minimum 10 NGN)',
    example: 500,
    minimum: 10,
  })
  @IsNumber()
  @Min(10)
  amount: number;
}
