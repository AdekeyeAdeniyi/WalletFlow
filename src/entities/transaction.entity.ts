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
import { Wallet } from './wallet.entity';
import { User } from './user.entity';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
}

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('transactions')
@Index('idx_transactions_user_id', ['user'])
@Index('idx_transactions_wallet_id', ['wallet'])
@Index('idx_transactions_reference', ['reference'])
@Index('idx_transactions_created_at', ['createdAt'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'varchar', length: 100, unique: true })
  reference: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    recipientWallet?: string;
    senderWallet?: string;
    paystackReference?: string;
    fee?: number;
    totalAmount?: number;
    description?: string;
  };

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @BeforeInsert()
  generateReference() {
    if (!this.reference) {
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');
      this.reference = `TXN${timestamp}${random}`;
    }
  }
}
