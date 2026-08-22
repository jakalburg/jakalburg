// Base User type matching the Prisma schema
export interface User {
  id: string;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  role: string;
  password: string | null;
  providers: string[];
  disabled: boolean;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// User with relations
export interface UserWithRelations extends User {
  accounts?: Account[];
  profiles?: Profile[];
}

// Account type matching the Prisma schema
export interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Profile type matching the Prisma schema
export interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  country: string | null;
  zipCode: string | null;
  contactNo: string | null;
  addresses: unknown | null; // JSON array of saved addresses (see AddressDto)
  defaultAddressId: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}
