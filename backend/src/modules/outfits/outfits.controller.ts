import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { OutfitsService } from './outfits.service';
import { GenerateOutfitDto } from './dto/generate-outfit.dto';
import { OutfitFeedbackDto } from './dto/outfit-feedback.dto';
import { WearOutfitDto } from './dto/wear-outfit.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  OCCASIONS,
  type Occasion,
  type OutfitResponse,
} from '../../common/types/domain.types';

@ApiTags('outfits')
@ApiBearerAuth()
@Controller('outfits')
export class OutfitsController {
  constructor(private readonly outfitsService: OutfitsService) {}

  @Post('generate')
  // AI çağrısı maliyetli olduğu için üretim uçları ayrıca sınırlanır
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @ApiOperation({ summary: 'Yapay zeka ile yeni kombin üretir' })
  generate(
    @CurrentUser('userId') userId: string,
    @Body() dto: GenerateOutfitDto,
  ): Promise<OutfitResponse> {
    return this.outfitsService.generate(userId, dto);
  }

  @Get('today')
  @ApiOperation({ summary: 'Bugünün kombinini getirir (yoksa null)' })
  @ApiQuery({
    name: 'date',
    required: false,
    description:
      'İstemcinin yerel günü (YYYY-MM-DD). Verilmezse sunucu günü kullanılır.',
  })
  @ApiQuery({
    name: 'occasion',
    required: false,
    enum: OCCASIONS,
    description: 'Verilirse yalnızca bu ortam için üretilmiş kombin döner.',
  })
  findToday(
    @CurrentUser('userId') userId: string,
    @Query('date') date?: string,
    @Query('occasion') occasion?: string,
  ): Promise<OutfitResponse | null> {
    // Geçersiz ortam değeri filtreyi düşürür; istek hata vermez
    const validOccasion = OCCASIONS.includes(occasion as Occasion)
      ? (occasion as Occasion)
      : undefined;
    return this.outfitsService.findToday(userId, date, validOccasion);
  }

  @Get()
  @ApiOperation({ summary: 'Kullanıcının kombin geçmişini listeler' })
  findAll(@CurrentUser('userId') userId: string): Promise<OutfitResponse[]> {
    return this.outfitsService.findAll(userId);
  }

  @Post(':id/feedback')
  @ApiOperation({ summary: 'Kombine geri bildirim verir' })
  sendFeedback(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OutfitFeedbackDto,
  ): Promise<OutfitResponse> {
    return this.outfitsService.sendFeedback(userId, id, dto);
  }

  @Post(':id/wear')
  @ApiOperation({ summary: 'Kombini giyildi olarak işaretler' })
  markWorn(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WearOutfitDto,
  ): Promise<OutfitResponse> {
    return this.outfitsService.markWorn(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Kombini siler' })
  remove(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.outfitsService.remove(userId, id);
  }
}
