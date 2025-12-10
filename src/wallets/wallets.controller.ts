import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Param,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { PaystackService } from '../paystack/paystack.service';
import { DepositDto } from './dto/deposit.dto';
import { TransferDto } from './dto/transfer.dto';
import { CombinedAuthGuard } from '../common/guard/combined-auth.guard';
import { ApiKeyPermissionGuard } from '../api-keys/guards/api-key.guard';
import { ApiKeyPermission } from '../entities/api-key.entity';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletsController {
  constructor(
    private walletsService: WalletsService,
    private paystackService: PaystackService,
  ) {}

  @Get('balance')
  @UseGuards(
    CombinedAuthGuard,
    new ApiKeyPermissionGuard([ApiKeyPermission.READ]),
  )
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Get wallet balance',
    description:
      'Retrieve the current wallet balance for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getBalance(@Req() req: { user: { id: string } }) {
    const balance = await this.walletsService.getBalance(req.user.id);
    return {
      status: true,
      message: 'Balance retrieved successfully',
      data: balance,
    };
  }

  @Post('deposit')
  @UseGuards(
    CombinedAuthGuard,
    new ApiKeyPermissionGuard([ApiKeyPermission.DEPOSIT]),
  )
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Initiate deposit',
    description:
      'Initialize a Paystack payment for depositing funds into wallet',
  })
  @ApiResponse({
    status: 200,
    description: 'Deposit initiated successfully',
    schema: {
      example: {
        status: true,
        message: 'Deposit initiated successfully',
        data: {
          reference: 'PSK1234567890',
          authorization_url: 'https://checkout.paystack.com/...',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deposit(
    @Req() req: { user: { id: string; email: string } },
    @Body() depositDto: DepositDto,
  ) {
    const wallet = await this.walletsService.getWallet(req.user.id);

    const result = await this.paystackService.initializeTransaction(
      req.user.email,
      depositDto.amount,
      {
        userId: req.user.id,
        walletId: wallet.id,
      },
    );

    await this.paystackService.saveTransactionRecord({
      reference: result.reference,
      amount: depositDto.amount,
      userId: req.user.id,
    });

    return {
      status: true,
      message: 'Deposit initiated successfully',
      data: {
        reference: result.reference,
        authorization_url: result.authorization_url,
      },
    };
  }

  @Post('transfer')
  @UseGuards(
    CombinedAuthGuard,
    new ApiKeyPermissionGuard([ApiKeyPermission.TRANSFER]),
  )
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Transfer funds',
    description: 'Transfer funds from your wallet to another wallet',
  })
  @ApiResponse({
    status: 200,
    description: 'Transfer completed successfully',
    schema: {
      example: {
        status: true,
        message: 'Transfer completed successfully',
        data: { transaction_ref: 'TRF1234567890' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient funds or invalid wallet',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async transfer(
    @Req() req: { user: { id: string } },
    @Body() transferDto: TransferDto,
  ) {
    const result = await this.walletsService.transferFunds(
      req.user.id,
      transferDto,
    );
    return {
      status: true,
      message: result.message,
      data: {
        transaction_ref: result.transaction_ref,
      },
    };
  }

  @Get('transactions')
  @UseGuards(
    CombinedAuthGuard,
    new ApiKeyPermissionGuard([ApiKeyPermission.READ]),
  )
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Get transaction history',
    description:
      'Retrieve paginated transaction history for the authenticated user',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTransactions(
    @Req() req: { user: { id: string } },
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const result = await this.walletsService.getTransactionHistory(
      req.user.id,
      Number(page),
      Number(limit),
    );
    return {
      status: true,
      message: 'Transactions retrieved successfully',
      data: result,
    };
  }

  @Get('deposit/:reference/status')
  @UseGuards(
    CombinedAuthGuard,
    new ApiKeyPermissionGuard([ApiKeyPermission.READ]),
  )
  @ApiBearerAuth('JWT-auth')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Get deposit status',
    description: 'Check the status of a deposit transaction by reference',
  })
  @ApiParam({
    name: 'reference',
    description: 'Paystack transaction reference',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction status retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getDepositStatus(@Param('reference') reference: string) {
    const result = await this.paystackService.getTransactionStatus(reference);
    return {
      status: true,
      message: 'Transaction status retrieved successfully',
      data: result,
    };
  }
}
