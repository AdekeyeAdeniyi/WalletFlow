// src/api-keys/entities/api-key.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { User } from './user.entity';
import { Exclude } from 'class-transformer';

export enum ApiKeyPermission {
  READ = 'read',
  DEPOSIT = 'deposit',
  TRANSFER = 'transfer',
}

@Entity('api_keys')
@Index('idx_api_keys_user_id', ['user'])
@Index('idx_api_keys_key', ['key'])
@Index('idx_api_keys_expires_at', ['expiresAt'])
@Index('idx_api_keys_is_active', ['isActive'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.apiKeys, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Exclude()
  key: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: ApiKeyPermission,
    array: true,
  })
  permissions: ApiKeyPermission[];

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsed: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  hasPermission(permission: ApiKeyPermission): boolean {
    return this.permissions.includes(permission);
  }

  @BeforeInsert()
  setKeyPrefix() {
    if (!this.key.startsWith(process.env.API_KEY_PREFIX || 'sk_live_')) {
      this.key = (process.env.API_KEY_PREFIX || 'sk_live_') + this.key;
    }
  }
}
