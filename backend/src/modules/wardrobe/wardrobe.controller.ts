import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type {
  ClothingAnalysisResult,
  ClothingItemResponse,
} from '../../common/types/domain.types';
import { CreateClothingItemDto } from './dto/create-clothing-item.dto';
import { UpdateClothingItemDto } from './dto/update-clothing-item.dto';
import { toClothingItemResponse } from './mappers/clothing-item.mapper';
import { WardrobeService } from './wardrobe.service';

/** Yüklenen görseller bellekte tutulur; 8 MB üstü kabul edilmez. */
const IMAGE_UPLOAD_OPTIONS = { limits: { fileSize: 8 * 1024 * 1024 } };

const IMAGE_BODY_SCHEMA = {
  schema: {
    type: 'object',
    properties: { image: { type: 'string', format: 'binary' } },
    required: ['image'],
  },
};

@ApiTags('wardrobe')
@ApiBearerAuth()
@Controller('wardrobe')
export class WardrobeController {
  constructor(private readonly wardrobe: WardrobeService) {}

  @Get('items')
  @ApiOperation({ summary: 'Kullanıcının gardırobundaki tüm parçaları listeler' })
  async findAll(
    @CurrentUser('userId') userId: string,
  ): Promise<ClothingItemResponse[]> {
    const items = await this.wardrobe.findAllByUser(userId);
    return items.map(toClothingItemResponse);
  }

  @Post('items')
  @ApiOperation({ summary: 'Gardıroba yeni parça ekler' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateClothingItemDto,
  ): Promise<ClothingItemResponse> {
    const item = await this.wardrobe.create(userId, dto);
    return toClothingItemResponse(item);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Parça bilgilerini günceller' })
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClothingItemDto,
  ): Promise<ClothingItemResponse> {
    const item = await this.wardrobe.update(userId, id, dto);
    return toClothingItemResponse(item);
  }

  @Delete('items/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Parçayı gardıroptan siler' })
  async remove(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.wardrobe.remove(userId, id);
  }

  @Post('items/:id/favorite')
  @ApiOperation({ summary: 'Favori durumunu tersine çevirir' })
  async toggleFavorite(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClothingItemResponse> {
    const item = await this.wardrobe.toggleFavorite(userId, id);
    return toClothingItemResponse(item);
  }

  // AI çağrısı maliyetli olduğu için ayrı ve daha sıkı bir limit uygulanır.
  @Post('analyze')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('image', IMAGE_UPLOAD_OPTIONS))
  @ApiConsumes('multipart/form-data')
  @ApiBody(IMAGE_BODY_SCHEMA)
  @ApiOperation({ summary: 'Kıyafet görselini AI ile analiz eder' })
  analyze(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ClothingAnalysisResult> {
    // userId maliyet defterine yazılır; hangi kullanıcının analizi olduğu izlenebilsin
    return this.wardrobe.analyzeImage(this.assertImage(file), userId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('image', IMAGE_UPLOAD_OPTIONS))
  @ApiConsumes('multipart/form-data')
  @ApiBody(IMAGE_BODY_SCHEMA)
  @ApiOperation({ summary: 'Kıyafet görselini kalıcı depoya yükler' })
  upload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    return this.wardrobe.uploadImage(this.assertImage(file));
  }

  /** Yalnızca görsel dosyalar kabul edilir. */
  private assertImage(file?: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('Görsel gerekli');
    }
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Sadece görsel dosyalar yüklenebilir');
    }
    return file;
  }
}
