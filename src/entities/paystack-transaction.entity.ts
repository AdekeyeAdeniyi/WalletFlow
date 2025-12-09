import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum PaystackTransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('paystack_transactions')
@Index('idx_paystack_reference', ['reference'])
@Index('idx_paystack_status', ['status'])
@Index('idx_paystack_webhook_processed', ['isWebhookProcessed'])
export class PaystackTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  reference: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaystackTransactionStatus,
    default: PaystackTransactionStatus.PENDING,
  })
  status: PaystackTransactionStatus;

  @Column({ type: 'jsonb', nullable: true })
  paystackData: any;

  @Column({ type: 'boolean', default: false })
  isWebhookProcessed: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  webhookProcessedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
