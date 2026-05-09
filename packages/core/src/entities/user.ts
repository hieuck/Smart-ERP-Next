import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'manager', 'staff']),
  tenantId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export class UserEntity {
  private props: User;

  constructor(props: User) {
    this.props = UserSchema.parse(props);
  }

  get id() { return this.props.id; }
  get email() { return this.props.email; }
  get name() { return this.props.name; }
  get role() { return this.props.role; }
  get tenantId() { return this.props.tenantId; }

  updateName(newName: string) {
    this.props.name = newName;
    this.props.updatedAt = new Date();
  }

  toJSON(): User {
    return { ...this.props };
  }
}