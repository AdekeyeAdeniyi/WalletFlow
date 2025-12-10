import {
  IsEnum,
  IsString,
  MinLength,
  MaxLength,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyPermission } from '../../entities/api-key.entity';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'API key name',
    example: 'Production API Key',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: 'API key permissions',
    example: ['read', 'deposit', 'transfer'],
    enum: ApiKeyPermission,
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ApiKeyPermission, { each: true })
  permissions: ApiKeyPermission[];

  @ApiProperty({
    description: 'API key expiry duration',
    example: '1M',
    enum: ['1H', '1D', '1M', '1Y'],
  })
  @IsString()
  @IsEnum(['1H', '1D', '1M', '1Y'])
  expiry: string;
}
