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
    await this.connectWithRetry();
  }

  /**
   * Connect with a few retries. Neon's free-tier compute auto-suspends when
   * idle; the first connection after a suspend triggers a cold start that can
   * take several seconds. Without this, a single cold start at boot throws
   * P1001 and takes the whole Nest app down. Retrying with backoff lets the
   * compute finish waking. (`connect_timeout` in DATABASE_URL widens the
   * per-attempt window; this widens the number of attempts.)
   */
  private async connectWithRetry(retries = 5, delayMs = 1500): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.$connect();
        if (attempt > 1) {
          this.logger.log(`Database connected on attempt ${attempt}.`);
        }
        return;
      } catch (error) {
        const isLast = attempt === retries;
        const reason = (error as Error).message?.split('\n')[0];
        this.logger.warn(
          `DB connect attempt ${attempt}/${retries} failed` +
            (isLast ? '' : `; retrying in ${delayMs}ms`) +
            `: ${reason}`,
        );
        if (isLast) throw error;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs = Math.min(delayMs * 2, 8000);
      }
    }
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
