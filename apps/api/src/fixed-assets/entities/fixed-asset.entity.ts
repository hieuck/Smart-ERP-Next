// @ts-ignore
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('fixed_assets')
export class FixedAsset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  tenantId: string;

  @Column()
  code: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column('decimal', { precision: 12, scale: 2 })
  purchaseCost: number;

  @Column('decimal', { precision: 12, scale: 2 })
  residualValue: number;

  @Column()
  usefulLifeMonths: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  accumulatedDepreciation: number;

  @Column()
  purchaseDate: Date;

  @Column()
  status: 'active' | 'disposed' | 'maintenance';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}