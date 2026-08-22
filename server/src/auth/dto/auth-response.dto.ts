import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Google OAuth user data
export interface GoogleUserData {
  provider: string;
  providerId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  picture: string;
  accessToken: string;
  refreshToken: string;
}

// User response DTO (public safe data)
export class UserResponseDto {
  @ApiProperty({ example: 'clzt0abcd0000xyz', description: 'User id.' })
  id: string;

  @ApiProperty({ example: 'amit@example.com', nullable: true, description: 'Email address, if any.' })
  email: string | null;

  @ApiProperty({ example: null, nullable: true, description: 'Avatar/profile image URL.' })
  image: string | null;

  @ApiProperty({ example: 'USER', description: 'Role: USER or ADMIN.' })
  role: string;

  @ApiProperty({
    example: '2026-08-16T12:00:00.000Z',
    nullable: true,
    description: 'When the email was verified; null if unverified.',
  })
  emailVerified: Date | null;

  @ApiProperty({ example: '2026-08-16T11:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-08-16T12:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ example: true, description: 'Whether a password is set on the account.' })
  hasPassword: boolean;

  @ApiProperty({
    example: ['credentials', 'google'],
    type: [String],
    description: 'Linked sign-in providers.',
  })
  providers: string[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' }, description: 'Linked OAuth accounts.' })
  accounts?: any[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' }, description: 'Profile records (name, etc.).' })
  profiles?: any[];
}

// Auth response with JWT token
export class AuthResponseDto {
  @ApiProperty({ type: () => UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT bearer token. Send as `Authorization: Bearer <token>`.',
  })
  accessToken: string;
}

// Generic `{ message }` response used by the OTP / password flows.
export class MessageResponseDto {
  @ApiProperty({ example: 'Verification code sent to your email.' })
  message: string;
}

// Response for logout.
export class LogoutResponseDto {
  @ApiProperty({ example: 'Logged out successfully.' })
  message: string;

  @ApiProperty({ example: true })
  success: boolean;
}

// Response for GET /auth/me.
export class MeResponseDto {
  @ApiProperty({ type: () => UserResponseDto })
  user: UserResponseDto;
}

// Response for GET /auth/has-password.
export class HasPasswordResponseDto {
  @ApiProperty({ example: true })
  hasPassword: boolean;
}

// JWT payload
export interface JwtPayload {
  email: string;
  sub: string; // user id
  tokenVersion: number; // must match user.tokenVersion or the token is stale
  iat?: number;
  exp?: number;
}
