// @ts-ignore
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from '../../tenants/tenants.entity';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  tenantId: string;

  @Column()
  @Index()
  code: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column()
  position: string;

  @Column()
  salary: number;

  @CreateDateColumn()
  hireDate: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.employees, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
