import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';

@ApiTags('API Keys')
@ApiBearerAuth('JWT-auth')
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post('create')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Create API key',
    description: 'Generate a new API key with specified permissions',
  })
  @ApiResponse({ status: 200, description: 'API key created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createApiKey(
    @Req() req: { user: { id: string } },
    @Body() createApiKeyDto: CreateApiKeyDto,
  ) {
    const result = await this.apiKeysService.createApiKey(
      req.user.id,
      createApiKeyDto,
    );

    return {
      status: true,
      message: 'API key created successfully',
      data: result,
    };
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get all API keys',
    description: 'Retrieve all API keys for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserApiKeys(@Req() req: { user: { id: string } }) {
    const result = await this.apiKeysService.getUserApiKeys(req.user.id);

    if (result.length === 0) {
      return {
        status: true,
        message: 'No API keys found',
        data: [],
      };
    }

    return {
      status: true,
      message: 'API keys retrieved successfully',
      data: result,
    };
  }

  @Post('rollover')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Rollover API key',
    description: 'Generate a new API key to replace an existing one',
  })
  @ApiResponse({ status: 200, description: 'API key rolled over successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async rolloverApiKey(
    @Req() req: { user: { id: string } },
    @Body() rolloverApiKeyDto: RolloverApiKeyDto,
  ) {
    const result = await this.apiKeysService.rolloverApiKey(
      req.user.id,
      rolloverApiKeyDto,
    );
    return {
      status: true,
      message: 'API key rolled over successfully',
      data: result,
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Revoke API key',
    description: 'Delete an API key permanently',
  })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revokeApiKey(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    await this.apiKeysService.revokeApiKey(req.user.id, id);
    return {
      status: true,
      message: 'API key revoked successfully',
      data: {},
    };
  }
}
