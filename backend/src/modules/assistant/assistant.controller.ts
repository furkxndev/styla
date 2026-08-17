import { Body, Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { ChatMessageResponse } from '../../common/types/domain.types';
import { AssistantService } from './assistant.service';
import { ChatDto } from './dto/chat.dto';

@ApiTags('assistant')
@ApiBearerAuth()
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  // AI çağrısı pahalı olduğu için sohbet uçtan uca sınırlandırılır.
  @Post('chat')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Stil asistanına soru sorar ve cevabı sohbete kaydeder' })
  chat(
    @CurrentUser('userId') userId: string,
    @Body() dto: ChatDto,
  ): Promise<ChatMessageResponse> {
    return this.assistantService.chat(userId, dto);
  }

  @Get('thread')
  @ApiOperation({ summary: 'Kullanıcının sohbet geçmişini döndürür' })
  getThread(@CurrentUser('userId') userId: string): Promise<ChatMessageResponse[]> {
    return this.assistantService.getThread(userId);
  }

  @Delete('thread')
  @HttpCode(204)
  @ApiOperation({ summary: 'Kullanıcının sohbet geçmişini siler' })
  clearThread(@CurrentUser('userId') userId: string): Promise<void> {
    return this.assistantService.clearThread(userId);
  }
}
