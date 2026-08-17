import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Outfit } from './outfit.entity';
import { ClothingItem } from '../../wardrobe/entities/clothing-item.entity';
import type { OutfitSlotRole } from '../../../common/types/domain.types';

/** Kombin ile gardırop parçasını bağlayan slot kaydı. */
@Entity('outfit_items')
export class OutfitItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  outfitId: string;

  @ManyToOne(() => Outfit, (outfit) => outfit.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'outfitId' })
  outfit?: Outfit;

  @Column('uuid')
  itemId: string;

  /** Yanıtta parçanın tamamı döndüğü için eager yüklenir */
  @ManyToOne(() => ClothingItem, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'itemId' })
  item?: ClothingItem;

  @Column({ type: 'varchar', length: 16 })
  role: OutfitSlotRole;

  /** AI'ın bu parçayı neden seçtiği */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  /** Slotların gösterim sırası */
  @Column({ type: 'int', default: 0 })
  position: number;
}
