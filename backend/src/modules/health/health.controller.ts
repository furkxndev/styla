import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { Public } from '../../common/decorators/public.decorator';

interface HealthResponse {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Servis ve veritabanı durumunu döner' })
  async check(): Promise<HealthResponse> {
    return {
      status: (await this.isDatabaseReachable()) ? 'ok' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /** Veritabanı erişilemezse servis "degraded" sayılır ama yanıt yine 200 döner. */
  private async isDatabaseReachable(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error(
        'Veritabanı sağlık kontrolü başarısız',
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
