import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  ClothingCategory,
  ClothingColor,
  Material,
  Pattern,
  Season,
  StyleTag,
  TemperatureRange,
} from '../../../common/types/domain.types';
import { User } from '../../users/entities/user.entity';

/**
 * Gardıroptaki tek bir kıyafet parçası.
 * Alan adları frontend'in beklediği ClothingItemResponse ile birebir aynıdır;
 * bu sayede mapper katmanı ince kalır.
 */
@Entity('clothing_items')
// Listeleme ve kategori bazlı sorgular her zaman kullanıcıya kısıtlı çalışır.
@Index(['userId', 'category'])
export class ClothingItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar' })
  imageUrl!: string;

  @Column({ type: 'varchar', nullable: true })
  thumbnailUrl!: string | null;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', length: 32 })
  category!: ClothingCategory;

  @Column({ type: 'varchar', nullable: true })
  subcategory!: string | null;

  // Renk listesi yapılandırılmış veri; sorgudan çok taşıma amaçlı → jsonb.
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  colors!: ClothingColor[];

  @Column({ type: 'varchar', length: 32 })
  pattern!: Pattern;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  styles!: StyleTag[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  seasons!: Season[];

  @Column({ type: 'jsonb', nullable: true })
  materials!: Material[] | null;

  @Column({ type: 'smallint' })
  formality!: number;

  @Column({ type: 'jsonb', default: () => `'{"min":-10,"max":40}'::jsonb` })
  temperatureRange!: TemperatureRange;

  @Column({ type: 'varchar', nullable: true })
  brand!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'boolean', default: false })
  isFavorite!: boolean;

  @Column({ type: 'int', default: 0 })
  wearCount!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastWornAt!: Date | null;

  // AI analizinin güven skoru; kullanıcı elle eklediyse boş kalır.
  @Column({ type: 'float', nullable: true })
  aiConfidence!: number | null;

  // Kullanıcı AI çıktısını düzenlediyse true olur (AI'a geri bildirim sinyali).
  @Column({ type: 'boolean', default: false })
  isUserEdited!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
