import { HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthStatus(): object {
    return {
      status: HttpStatus.OK,
      timestamp: new Date().toISOString(),
      message: 'Wallet Service is healthy',
    };
  }
}
