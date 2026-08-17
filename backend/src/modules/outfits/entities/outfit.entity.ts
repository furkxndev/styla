import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OutfitItem } from './outfit-item.entity';
import type {
  DislikeReason,
  Occasion,
  OutfitScore,
  WeatherSnapshot,
} from '../../../common/types/domain.types';

/** AI tarafından üretilmiş bir günlük kombin kaydı. */
@Entity('outfits')
@Index(['userId', 'date'])
export class Outfit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  /** YYYY-MM-DD — gün bazlı sorgular için tarih değil metin tutulur */
  @Column({ type: 'varchar', length: 10 })
  date: string;

  @Column({ type: 'varchar', length: 32 })
  occasion: Occasion;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'text', nullable: true })
  stylingTip: string | null;

  /** Skorlar AI tarafından üretilir; backend hesaplama yapmaz */
  @Column({ type: 'jsonb' })
  score: OutfitScore;

  /** Kombin üretildiği andaki hava durumu anlık görüntüsü */
  @Column({ type: 'jsonb', nullable: true })
  weather: WeatherSnapshot | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  feedback: 'liked' | 'disliked' | 'worn' | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  feedbackReason: DislikeReason | null;

  @Column({ type: 'timestamptz', nullable: true })
  wornAt: Date | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', nullable: true })
  photoUrl: string | null;

  @Column({ type: 'boolean', default: true })
  isGeneratedByAI: boolean;

  /** Kombin ile parçaları birlikte yazılır/okunur */
  @OneToMany(() => OutfitItem, (item) => item.outfit, {
    cascade: true,
    eager: true,
  })
  items: OutfitItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
