import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type {
  AdminOverview,
  AdminUserListResponse,
  AdminUserSummary,
  AiModelOption,
  AiUsageSummary,
  AppSettings,
} from '../../common/types/domain.types';
import { UpdateSettingsDto } from '../settings/dto/update-settings.dto';
import { AdminService } from './admin.service';
import { DailyOutfitService } from '../scheduler/daily-outfit.service';
import type { DailyOutfitRunResult } from '../scheduler/daily-outfit.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

/**
 * Yönetim uçları.
 *
 * Erişim sınıf seviyesinde @Roles('admin') ile kısıtlıdır; tek tek uçlara
 * dekoratör konmaz, böylece yeni bir uç eklendiğinde açıkta kalmaz.
 * Sıkı hız sınırı da aynı nedenle sınıf seviyesindedir.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Throttle({ default: { limit: 60, ttl: 60000 } })
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly dailyOutfit: DailyOutfitService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Kullanıcı, içerik ve AI özet metriklerini döner' })
  getOverview(): Promise<AdminOverview> {
    return this.adminService.getOverview();
  }

  @Get('users')
  @ApiOperation({ summary: 'Kullanıcıları filtreli ve sayfalı listeler' })
  listUsers(@Query() query: ListUsersQueryDto): Promise<AdminUserListResponse> {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Tek bir kullanıcının yönetim özetini döner' })
  getUser(@Param('id', ParseUUIDPipe) id: string): Promise<AdminUserSummary> {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Kullanıcının rolünü veya aktifliğini değiştirir' })
  updateUser(
    @CurrentUser('userId') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserAdminDto,
  ): Promise<AdminUserSummary> {
    return this.adminService.updateUser(actorId, id, dto);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Kullanıcıyı ve tüm verisini siler' })
  deleteUser(
    @CurrentUser('userId') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.adminService.deleteUser(actorId, id);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Çalışma anı sistem ayarlarını döner' })
  getSettings(): Promise<AppSettings> {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Sistem ayarlarını günceller' })
  updateSettings(
    @CurrentUser('userId') actorId: string,
    @Body() dto: UpdateSettingsDto,
  ): Promise<AppSettings> {
    return this.adminService.updateSettings(dto, actorId);
  }

  @Get('models')
  @ApiOperation({
    summary: 'Sağlayıcıdaki seçilebilir AI modellerini listeler',
  })
  listModels(): Promise<AiModelOption[]> {
    return this.adminService.listModels();
  }

  @Get('usage')
  @ApiOperation({ summary: 'AI maliyet ve token kullanım özetini döner' })
  getUsage(): Promise<AiUsageSummary> {
    return this.adminService.getUsage();
  }

  @Post('jobs/daily-outfit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sabah kombini görevini şimdi çalıştırır',
    description:
      'Bildirim saatini beklemeden, bugün için kombini olmayan kullanıcılara kombin üretir.',
  })
  runDailyOutfitJob(): Promise<DailyOutfitRunResult> {
    return this.dailyOutfit.run({ force: true });
  }
}
