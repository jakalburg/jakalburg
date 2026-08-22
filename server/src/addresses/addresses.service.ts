import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddressDto } from '../common/dto/address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  /** The user's saved address history (stored as a JSON array on their Profile). */
  async getAddresses(userId: string): Promise<AddressDto[]> {
    const profile = await this.prisma.profile.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { addresses: true },
    });
    return this.read(profile?.addresses);
  }

  /** Replace the whole address history (the client mirrors its book here).
   *  `defaultAddressId` is derived from whichever address is flagged default,
   *  keeping the scalar column consistent with the JSON. */
  async replaceAddresses(
    userId: string,
    addresses: AddressDto[],
  ): Promise<AddressDto[]> {
    const defaultAddressId = addresses.find((a) => a.isDefault)?.id ?? null;
    const data = {
      addresses: addresses as unknown as Prisma.InputJsonValue,
      defaultAddressId,
    };

    // Every user gets a Profile at registration, but upsert defensively in case
    // one is missing (e.g. a legacy account).
    const existing = await this.prisma.profile.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.profile.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.profile.create({ data: { userId, ...data } });
    }

    return addresses;
  }

  private read(value: Prisma.JsonValue | null | undefined): AddressDto[] {
    return Array.isArray(value) ? (value as unknown as AddressDto[]) : [];
  }
}
