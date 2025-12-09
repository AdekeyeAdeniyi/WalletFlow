import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
  BeforeInsert,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';

@Entity('wallets')
@Index('idx_wallets_user_id', ['user'])
@Index('idx_wallets_number', ['walletNumber'])
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  walletNumber: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'varchar', length: 3, default: 'NGN' })
  currency: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions: Transaction[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  generateWalletNumber() {
    if (!this.walletNumber) {
      const timestamp = Date.now().toString().slice(-10);
      const random = Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, '0');
      this.walletNumber = `WLT${timestamp}${random}`;
    }
  }

  hasSufficientBalance(amount: number): boolean {
    return this.balance >= amount;
  }

  credit(amount: number): void {
    this.balance = Number(this.balance) + Number(amount);
  }

  debit(amount: number): void {
    this.balance = Number(this.balance) - Number(amount);
  }
}
