import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from './employee.entity';
export class Payroll {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tenantId: string;

  @Column()
  employeeId: number;

  @Column()
  month: string;

  @Column()
  year: number;

  @Column()
  baseSalary: number;

  @Column()
  allowances: number;

  @Column()
  deductions: number;

  @Column()
  netSalary: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
}