import { env } from '../config/env';
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Ensure an admin user exists (idempotent). Runs on boot.
   */
  async checkAndCreateAdmin() {
    const adminEmail = env.ADMIN_EMAIL;
    const adminPassword = env.ADMIN_PASSWORD;

    try {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const admin = await this.user.upsert({
        where: { email: adminEmail },
        update: {
          password: hashedPassword,
          role: 'admin',
          emailVerified: new Date(),
        },
        create: {
          email: adminEmail,
          password: hashedPassword,
          role: 'admin',
          image: '',
          emailVerified: new Date(),
          providers: ['email'],
          profiles: {
            create: {
              firstName: 'System',
              lastName: 'Admin',
            },
          },
        },
      });

      this.logger.log(`Admin user check complete. Email: ${admin.email}`);
    } catch (error) {
      this.logger.error('Failed to check/create admin user:', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
