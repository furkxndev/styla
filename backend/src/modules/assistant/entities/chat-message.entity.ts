import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import type { ChatRole } from '../../../common/types/domain.types';

/**
 * Asistan sohbetinin kalıcı kaydı.
 * Konuşma geçmişi AI'a bağlam olarak geri verildiği için mesajlar
 * kullanıcı bazında ve zaman sıralı okunur.
 */
@Entity('chat_messages')
@Index(['userId', 'createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar', length: 16 })
  role: ChatRole;

  @Column({ type: 'text' })
  content: string;

  /** AI cevabında atıf yapılan gardırop parçaları (doğrulanmış id'ler) */
  @Column({ type: 'jsonb', nullable: true })
  referencedItemIds: string[] | null;

  /** AI bir kombin önerip kalıcı kaydedildiyse ilgili Outfit id'si */
  @Column({ type: 'uuid', nullable: true })
  suggestedOutfitId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
