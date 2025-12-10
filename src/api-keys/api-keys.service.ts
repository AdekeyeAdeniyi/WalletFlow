import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiKey } from 'src/entities/api-key.entity';
import { DataSource, MoreThan, MoreThanOrEqual, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { User } from 'src/entities/user.entity';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}
  private generateApiKey(): string {
    const prefix =
      this.configService.get<string>('API_KEY_PREFIX') || 'sk_live_';
    const randomBytes = crypto.randomBytes(32);
    const key = randomBytes
      .toString('base64')
      .replace(/\+/g, '')
      .replace(/\//g, '')
      .replace(/=/g, '')
      .slice(0, 40);
    return prefix + key;
  }

  private generateExpiryDate(expiryString: string): Date {
    const now = new Date();
    switch (expiryString) {
      case '1H':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case '1D':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '1M':
        return new Date(now.setMonth(now.getMonth() + 1));
      case '1Y':
        return new Date(now.setFullYear(now.getFullYear() + 1));
      default:
        throw new HttpException(
          'Invalid expiry format',
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  private hashApiKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  async createApiKey(
    userId: string,
    createApiKeyDto: CreateApiKeyDto,
  ): Promise<{ api_key: string; expires_at: Date; key_id: string }> {
    const now = new Date();
    const activeKeyCount = await this.apiKeyRepository.count({
      where: {
        userId: userId,
        isActive: true,
        expiresAt: MoreThanOrEqual(now),
      },
    });

    if (activeKeyCount >= 5) {
      throw new HttpException(
        'API key limit reached. Please deactivate existing keys to create new ones.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const key = this.generateApiKey();
    const expiresAt = this.generateExpiryDate(createApiKeyDto.expiry);
    const hashedKey = this.hashApiKey(key);

    const apiKey = this.apiKeyRepository.create({
      key: hashedKey,
      name: createApiKeyDto.name,
      permissions: createApiKeyDto.permissions,
      expiresAt,
      userId: userId,
    });

    const savedKey = await this.apiKeyRepository.save(apiKey);

    return {
      api_key: key,
      expires_at: expiresAt,
      key_id: savedKey.id,
    };
  }

  async validateApiKey(apiKey: string): Promise<any> {
    const keyRecord = await this.apiKeyRepository.findOne({
      where: { key: apiKey, isActive: true },
      relations: ['user'],
    });

    if (!keyRecord) {
      return null;
    }

    return keyRecord;
  }

  async updateLastUsed(keyId: string): Promise<void> {
    await this.apiKeyRepository.update(keyId, {
      lastUsed: new Date(),
    });
  }

  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    try {
      const keys = await this.apiKeyRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      return keys;
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve API keys',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async rolloverApiKey(
    userId: string,
    dto: RolloverApiKeyDto,
  ): Promise<{ api_key: string; expires_at: Date }> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const expiredKey = await queryRunner.manager
        .createQueryBuilder(ApiKey, 'key')
        .setLock('pessimistic_write')
        .where('key.id = :id', { id: dto.expired_key_id })
        .andWhere('key.userId = :userId', { userId: userId })
        .andWhere('key.isActive = true')
        .andWhere('key.expiresAt <= NOW()')
        .getOne();

      if (!expiredKey) {
        throw new HttpException(
          'Expired API key not found or still active',
          HttpStatus.BAD_REQUEST,
        );
      }

      expiredKey.isActive = false;
      await queryRunner.manager.save(ApiKey, expiredKey);

      const rawKey = this.generateApiKey();
      const keyHash = this.hashApiKey(rawKey);
      const expiresAt = this.generateExpiryDate(dto.expiry);

      const newApiKey = queryRunner.manager.create(ApiKey, {
        userId: userId,
        name: expiredKey.name,
        permissions: expiredKey.permissions,
        key: keyHash,
        expiresAt,
        isActive: true,
      });

      await queryRunner.manager.save(ApiKey, newApiKey);

      await queryRunner.commitTransaction();

      return {
        api_key: rawKey,
        expires_at: expiresAt,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    const result = await this.apiKeyRepository.update(
      { id: keyId, userId },
      { isActive: false },
    );

    if (result.affected === 0) {
      throw new HttpException(
        'API key not found or you do not have permission to revoke it',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
