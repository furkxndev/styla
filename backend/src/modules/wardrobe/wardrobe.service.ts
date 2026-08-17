import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { ClothingAnalysisResult } from '../../common/types/domain.types';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../storage/storage.service';
import { CreateClothingItemDto } from './dto/create-clothing-item.dto';
import { UpdateClothingItemDto } from './dto/update-clothing-item.dto';
import { ClothingItem } from './entities/clothing-item.entity';

@Injectable()
export class WardrobeService {
  constructor(
    @InjectRepository(ClothingItem)
    private readonly items: Repository<ClothingItem>,
    private readonly ai: AiService,
    private readonly storage: StorageService,
  ) {}

  /** Gardırop listesi — en yeni eklenen üstte. */
  findAllByUser(userId: string): Promise<ClothingItem[]> {
    return this.items.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneOrFail(userId: string, id: string): Promise<ClothingItem> {
    const item = await this.items.findOne({ where: { id, userId } });
    if (!item) {
      throw new NotFoundException('Ürün bulunamadı');
    }
    return item;
  }

  /**
   * Verilen id'lerden kullanıcıya ait olanları döner.
   * AI'ın ürettiği itemId'lerin gerçekten var olduğunu doğrulamak için kullanılır.
   */
  async findByIds(userId: string, ids: string[]): Promise<ClothingItem[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.items.find({ where: { userId, id: In(ids) } });
  }

  async create(
    userId: string,
    dto: CreateClothingItemDto,
  ): Promise<ClothingItem> {
    const item = this.items.create({
      userId,
      name: dto.name,
      category: dto.category,
      subcategory: dto.subcategory ?? null,
      imageUrl: dto.imageUrl,
      thumbnailUrl: dto.thumbnailUrl ?? null,
      colors: dto.colors,
      pattern: dto.pattern,
      styles: dto.styles,
      seasons: dto.seasons,
      materials: dto.materials ?? null,
      formality: dto.formality,
      temperatureRange: dto.temperatureRange,
      brand: dto.brand ?? null,
      notes: dto.notes ?? null,
      isFavorite: dto.isFavorite ?? false,
      aiConfidence: dto.aiConfidence ?? null,
    });
    return this.items.save(item);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateClothingItemDto,
  ): Promise<ClothingItem> {
    const item = await this.findOneOrFail(userId, id);

    // Yalnızca gönderilen alanları uygula; undefined olanlar mevcut değeri korur.
    if (dto.name !== undefined) item.name = dto.name;
    if (dto.category !== undefined) item.category = dto.category;
    if (dto.subcategory !== undefined) item.subcategory = dto.subcategory;
    if (dto.imageUrl !== undefined) item.imageUrl = dto.imageUrl;
    if (dto.thumbnailUrl !== undefined) item.thumbnailUrl = dto.thumbnailUrl;
    if (dto.colors !== undefined) item.colors = dto.colors;
    if (dto.pattern !== undefined) item.pattern = dto.pattern;
    if (dto.styles !== undefined) item.styles = dto.styles;
    if (dto.seasons !== undefined) item.seasons = dto.seasons;
    if (dto.materials !== undefined) item.materials = dto.materials;
    if (dto.formality !== undefined) item.formality = dto.formality;
    if (dto.temperatureRange !== undefined)
      item.temperatureRange = dto.temperatureRange;
    if (dto.brand !== undefined) item.brand = dto.brand;
    if (dto.notes !== undefined) item.notes = dto.notes;
    if (dto.isFavorite !== undefined) item.isFavorite = dto.isFavorite;
    if (dto.aiConfidence !== undefined) item.aiConfidence = dto.aiConfidence;

    // Kullanıcı AI çıktısına dokundu → AI'a bu bilgi sinyal olarak taşınır.
    item.isUserEdited = true;
    return this.items.save(item);
  }

  async remove(userId: string, id: string): Promise<void> {
    const item = await this.findOneOrFail(userId, id);
    await this.items.remove(item);
  }

  async toggleFavorite(userId: string, id: string): Promise<ClothingItem> {
    const item = await this.findOneOrFail(userId, id);
    item.isFavorite = !item.isFavorite;
    return this.items.save(item);
  }

  /**
   * Kombin giyildiğinde çağrılır; tek UPDATE ile sayaçları arttırır.
   * userId filtresi savunma amaçlıdır: başka kullanıcının parçası güncellenemez.
   */
  async incrementWear(userId: string, itemIds: string[], wornAt: Date): Promise<void> {
    if (itemIds.length === 0) {
      return;
    }
    await this.items
      .createQueryBuilder()
      .update(ClothingItem)
      .set({
        wearCount: () => '"wearCount" + 1',
        lastWornAt: wornAt,
      })
      .whereInIds(itemIds)
      .andWhere('"userId" = :userId', { userId })
      .execute();
  }

  /** Görseli data URL'e çevirip AI analizine gönderir (dosya diske yazılmaz). */
  analyzeImage(
    file: Express.Multer.File,
    userId?: string,
  ): Promise<ClothingAnalysisResult> {
    if (!file.buffer) {
      throw new BadRequestException('Görsel okunamadı');
    }
    return this.ai.analyzeClothingImage(this.storage.toDataUrl(file), userId);
  }

  /** Görseli kalıcı depoya yazar ve erişilebilir URL döner. */
  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    const { url } = await this.storage.save(file);
    return { url };
  }
}
