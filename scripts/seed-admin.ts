// scripts/seed-admin.ts
import { AppDataSource } from '@/config/database';
import { User, UserRole } from '@/database/entities/user.entity';

export async function seedAdmin() {
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);

  const admin = userRepo.create({
    firstName: 'Super',
    lastName: 'Admin',
    email: 'admin@amda.com',
    phoneNumber: '+2348012345678',
    password: 'AdminPass123!',
    role: UserRole.ADMIN,
    isFirstLogin: false,
  });

  await userRepo.save(admin);
  process.exit(0);
}

seedAdmin();
