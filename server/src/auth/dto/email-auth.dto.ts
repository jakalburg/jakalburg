import {
  IsEmail,
  IsString,
  MinLength,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpPurpose } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'Amit', description: "User's first name." })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Sonani', description: "User's last name." })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'amit@example.com', description: 'Email address; a signup OTP is sent here.' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'hunter2pass',
    minLength: 8,
    description: 'Plain password, at least 8 characters. Hashed server-side.',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsNotEmpty()
  password: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'amit@example.com', description: 'Email the OTP was sent to.' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit code from the verification email.' })
  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class ResendOtpDto {
  @ApiProperty({ example: 'amit@example.com', description: 'Email to resend the code to.' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    enum: OtpPurpose,
    example: OtpPurpose.SIGNUP_VERIFICATION,
    description: 'Which OTP flow to resend for.',
  })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}

export class LoginWithPasswordDto {
  @ApiProperty({ example: 'amit@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'hunter2pass', description: 'Account password.' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'amit@example.com',
    description: 'Account email to send a password-reset link to.',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'amit@example.com',
    description: 'Account email — must match the one the reset link was sent to.',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description:
      'Single-use reset token from the emailed link (the `token` query param).',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'newhunter2pass',
    minLength: 8,
    description: 'New password, at least 8 characters.',
  })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @IsNotEmpty()
  newPassword: string;
}

export class SetPasswordDto {
  @ApiProperty({
    example: 'hunter2pass',
    minLength: 8,
    description: 'Password to set on an account that has none (e.g. Google-only).',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsNotEmpty()
  password: string;
}

export class ChangePasswordDto {
  @ApiPropertyOptional({
    example: 'hunter2pass',
    description: 'Current password. Optional only for accounts that have none set.',
  })
  @IsString()
  @IsOptional()
  currentPassword?: string;

  @ApiProperty({
    example: 'newhunter2pass',
    minLength: 8,
    description: 'New password, at least 8 characters.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword: string;
}
