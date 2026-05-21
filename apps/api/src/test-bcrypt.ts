import * as bcrypt from 'bcryptjs';

const hash = '$2b$10$rQZSBNWpFzOQzLbJkq8UeODpYAnkJmSbS5K1x5K9K0YP5xXJKQXO2';
const passwords = [
  'admin123',
  'password123',
  'demo123456',
  'admin@123456',
  'Admin@123456',
  'admin',
  '123456',
  'change_me_strong_password',
  'secret_password'
];

for (const pw of passwords) {
  const match = bcrypt.compareSync(pw, hash);
  console.log(`Password: "${pw}" -> Match: ${match}`);
}
