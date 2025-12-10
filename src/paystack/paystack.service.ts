import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import {
  PaystackTransaction,
  PaystackTransactionStatus,
} from '../entities/paystack-transaction.entity';
import { WalletsService } from '../wallets/wallets.service';
import { TransactionType } from '../entities/transaction.entity';

@Injectable()
export class PaystackService {
  private readonly secretKey: string;
  private readonly baseURL: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(PaystackTransaction)
    private paystackTransactionRepository: Repository<PaystackTransaction>,
    private walletsService: WalletsService,
  ) {
    this.secretKey = this.configService.get('PAYSTACK_SECRET_KEY')!;
    this.baseURL = this.configService.get('PAYSTACK_BASE_URL')!;
  }

  async initializeTransaction(
    email: string,
    amount: number,
    metadata: any,
  ): Promise<{ reference: string; authorization_url: string }> {
    try {
      const reference = `PSK${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const response = await axios.post(
        `${this.baseURL}/transaction/initialize`,
        {
          email,
          amount: amount * 100,
          reference,
          metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.status) {
        throw new BadRequestException(
          response.data.message || 'Failed to initialize transaction',
        );
      }

      return {
        reference,
        authorization_url: response.data.data.authorization_url,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error.response?.data?.message || 'Payment initialization failed',
      );
    }
  }

  async verifyTransaction(
    reference: string,
  ): Promise<{ status: string; amount: number; reference: string }> {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      if (!response.data.status) {
        throw new BadRequestException('Transaction verification failed');
      }

      return {
        status: response.data.data.status,
        amount: response.data.data.amount / 100,
        reference: response.data.data.reference,
      };
    } catch (error) {
      throw new BadRequestException('Transaction verification failed');
    }
  }

  async getTransactionStatus(
    reference: string,
  ): Promise<{ reference: string; status: string; amount: number }> {
    const transaction = await this.paystackTransactionRepository.findOne({
      where: { reference },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    return {
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount,
    };
  }

  validateWebhookSignature(payload: any, signature: string): boolean {
    try {
      const hash = crypto
        .createHmac('sha512', this.configService.get('PAYSTACK_SECRET_KEY')!)
        .update(JSON.stringify(payload))
        .digest('hex');
      return hash === signature;
    } catch (error) {
      return false;
    }
  }

  // src/paystack/paystack.service.ts
  async processWebhook(payload: any): Promise<{ status: boolean }> {
    const { event, data } = payload;

    if (event !== 'charge.success') {
      return { status: true };
    }

    const { reference } = data;

    // 🔴 CRITICAL: Check for duplicate BEFORE starting transaction
    const existingTransaction =
      await this.paystackTransactionRepository.findOne({
        where: { reference },
      });

    // If already exists and processed, skip
    if (existingTransaction && existingTransaction.isWebhookProcessed) {
      console.log(`⚠️ Webhook already processed for reference: ${reference}`);
      return { status: true };
    }

    // If exists but not processed, update it
    if (existingTransaction) {
      return this.updateExistingTransaction(existingTransaction, data);
    }

    // Otherwise, create new transaction
    return this.createNewTransaction(data);
  }

  private async updateExistingTransaction(
    transaction: PaystackTransaction,
    data: any,
  ): Promise<{ status: boolean }> {
    const queryRunner =
      this.paystackTransactionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      transaction.status = PaystackTransactionStatus.SUCCESS;
      transaction.paystackData = data;
      transaction.isWebhookProcessed = true;
      transaction.webhookProcessedAt = new Date();

      await queryRunner.manager.save(transaction);

      // Credit wallet if not already done
      if (data.metadata && data.metadata.userId && data.metadata.walletId) {
        await this.walletsService.updateWalletBalance(
          data.metadata.walletId,
          data.amount / 100,
          transaction.reference,
          TransactionType.DEPOSIT,
        );
      }

      await queryRunner.commitTransaction();
      return { status: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async createNewTransaction(data: any): Promise<{ status: boolean }> {
    const { reference, amount, metadata } = data;

    const queryRunner =
      this.paystackTransactionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transactionData = {
        reference,
        amount: amount / 100,
        status: PaystackTransactionStatus.SUCCESS,
        paystackData: data,
        isWebhookProcessed: true,
        webhookProcessedAt: new Date(),
      };

      if (metadata && metadata.userId) {
        transactionData['userId'] = metadata.userId;
      }

      const transaction = queryRunner.manager.create(
        PaystackTransaction,
        transactionData,
      );
      await queryRunner.manager.save(transaction);

      if (metadata && metadata.userId && metadata.walletId) {
        await this.walletsService.updateWalletBalance(
          metadata.walletId,
          amount / 100,
          reference,
          TransactionType.DEPOSIT,
        );
      }

      await queryRunner.commitTransaction();
      return { status: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error.code === '23505' || error.message.includes('duplicate key')) {
        console.log(`⚠️ Duplicate reference detected: ${reference}`);
        return { status: true };
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async saveTransactionRecord(data: {
    reference: string;
    amount: number;
    userId: string;
  }): Promise<void> {
    const transaction = this.paystackTransactionRepository.create({
      reference: data.reference,
      amount: data.amount,
      userId: data.userId,
      status: PaystackTransactionStatus.PENDING,
    });

    await this.paystackTransactionRepository.save(transaction);
  }
}
