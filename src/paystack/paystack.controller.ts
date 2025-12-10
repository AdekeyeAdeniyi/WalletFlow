import {
  Controller,
  Post,
  Headers,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { PaystackService } from './paystack.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Webhooks')
@Controller('wallet/paystack')
export class PaystackController {
  constructor(private paystackService: PaystackService) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Paystack webhook',
    description:
      'Handles payment notifications from Paystack. This endpoint is public and validates webhook signatures.',
  })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'Paystack webhook signature for verification',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() payload: any,
  ) {
    const isValid = this.paystackService.validateWebhookSignature(
      payload,
      signature,
    );

    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    await this.paystackService.processWebhook(payload);
    return {
      status: true,
      message: 'Webhook processed successfully',
      data: {},
    };
  }
}
