import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Wallet } from 'src/entities/wallet.entity';
import { DataSource, Repository } from 'typeorm';
import { TransferDto } from './dto/transfer.dto';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from 'src/entities/transaction.entity';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
  ) {}
  async createWallet(userId: string): Promise<Wallet> {
    const existingWallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (existingWallet) {
      throw new HttpException('Wallet already exists', HttpStatus.BAD_REQUEST);
    }

    const wallet = this.walletRepository.create({
      userId,
    });

    return this.walletRepository.save(wallet);
  }

  async getWallet(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
    }

    return wallet;
  }

  async getBalance(userId: string): Promise<{ balance: number }> {
    const wallet = await this.getWallet(userId);
    return { balance: Number(wallet.balance) };
  }

  async transferFunds(
    senderUserId: string,
    transferDto: TransferDto,
  ): Promise<{ message: string; transaction_ref: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const senderWallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: senderUserId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!senderWallet) {
        throw new HttpException(
          'Sender wallet not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const recipientWallet = await queryRunner.manager
        .createQueryBuilder(Wallet, 'wallet')
        .where('wallet.walletNumber = :walletNumber', {
          walletNumber: transferDto.wallet_number,
        })
        .setLock('pessimistic_write')
        .getOne();

      if (!recipientWallet) {
        throw new HttpException(
          'Recipient wallet not found',
          HttpStatus.NOT_FOUND,
        );
      }

      if (senderWallet.walletNumber === transferDto.wallet_number) {
        throw new HttpException(
          'Cannot transfer to your own wallet',
          HttpStatus.BAD_REQUEST,
        );
      }

      const fee = Math.max(transferDto.amount * 0.015, 10);
      const totalAmount = transferDto.amount + fee;

      if (!senderWallet.hasSufficientBalance(totalAmount)) {
        throw new HttpException('Insufficient funds', HttpStatus.BAD_REQUEST);
      }

      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 10000);
      const senderRef = `TRF-OUT-${timestamp}-${randomSuffix}`;
      const recipientRef = `TRF-IN-${timestamp}-${randomSuffix}`;
      const transactionRef = `TRF${timestamp}${randomSuffix}`;

      senderWallet.debit(totalAmount);
      recipientWallet.credit(transferDto.amount);

      const senderTransaction = queryRunner.manager.create(Transaction, {
        userId: senderUserId,
        walletId: senderWallet.id,
        type: TransactionType.TRANSFER_OUT,
        amount: transferDto.amount,
        status: TransactionStatus.SUCCESS,
        reference: senderRef,
        metadata: {
          recipientWallet: recipientWallet.walletNumber,
          fee,
          totalAmount,
          transactionRef,
          description: `Transfer to ${recipientWallet.walletNumber}`,
        },
      });

      const recipientTransaction = queryRunner.manager.create(Transaction, {
        userId: recipientWallet.userId,
        walletId: recipientWallet.id,
        type: TransactionType.TRANSFER_IN,
        amount: transferDto.amount,
        status: TransactionStatus.SUCCESS,
        reference: recipientRef,
        metadata: {
          senderWallet: senderWallet.walletNumber,
          transactionRef,
          description: `Transfer from ${senderWallet.walletNumber}`,
        },
      });

      await queryRunner.manager.save(senderWallet);
      await queryRunner.manager.save(recipientWallet);
      await queryRunner.manager.save(senderTransaction);
      await queryRunner.manager.save(recipientTransaction);

      await queryRunner.commitTransaction();

      return {
        message: 'Transfer completed successfully',
        transaction_ref: transactionRef,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTransactionHistory(
    userId: string,
    page = 1,
    limit = 50,
  ): Promise<{ transactions: Transaction[]; pagination: any }> {
    const skip = (page - 1) * limit;

    try {
      const [transactions, total] =
        await this.transactionRepository.findAndCount({
          where: { userId },
          order: { createdAt: 'DESC' },
          skip,
          take: limit,
        });

      return {
        transactions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new HttpException(
        'Error fetching transaction history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateWalletBalance(
    walletId: string,
    amount: number,
    reference: string,
    type: TransactionType = TransactionType.DEPOSIT,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
      }

      wallet.credit(amount);
      await queryRunner.manager.save(wallet);

      const transaction = queryRunner.manager.create(Transaction, {
        userId: wallet.userId,
        walletId: wallet.id,
        type,
        amount,
        status: TransactionStatus.SUCCESS,
        reference,
        metadata: {
          description:
            type === TransactionType.DEPOSIT
              ? 'Paystack deposit'
              : 'Manual adjustment',
        },
      });

      await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
