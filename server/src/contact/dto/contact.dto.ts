import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/** The two kinds of submission this endpoint accepts. */
export const CONTACT_TYPES = ['contact_us', 'newsletter'] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

/** Field length caps — generous for a real message, bounded so the column and
 *  the admin table stay sane. */
export const CONTACT_NAME_MAX = 120;
export const CONTACT_SUBJECT_MAX = 200;
export const CONTACT_MESSAGE_MAX = 5000;

/**
 * Public create payload from the storefront.
 *
 * `email` and `type` are always required. For `contact_us` a `message` is also
 * required (the whole point is the message); for `newsletter` only the email
 * matters, so name/subject/message are ignored/optional.
 */
export class CreateContactDto {
  @ApiProperty({
    enum: CONTACT_TYPES,
    example: 'contact_us',
    description: 'Which storefront form this came from.',
  })
  @IsIn(CONTACT_TYPES)
  type: ContactType;

  @ApiProperty({ example: 'aisha@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'Aisha Khan',
    description: `Sender name. Optional; max ${CONTACT_NAME_MAX} chars.`,
  })
  @IsOptional()
  @IsString()
  @MaxLength(CONTACT_NAME_MAX)
  name?: string;

  @ApiPropertyOptional({
    example: 'Order enquiry',
    description: `Subject line (contact_us only). Max ${CONTACT_SUBJECT_MAX} chars.`,
  })
  @IsOptional()
  @IsString()
  @MaxLength(CONTACT_SUBJECT_MAX)
  subject?: string;

  @ApiPropertyOptional({
    example: "Hi, I'd like to know the delivery date for my order.",
    description:
      `The message. Required for contact_us, ignored for newsletter. ` +
      `Max ${CONTACT_MESSAGE_MAX} chars.`,
  })
  // Required only for contact_us; a newsletter signup has no message.
  @ValidateIf((o: CreateContactDto) => o.type === 'contact_us')
  @IsString()
  @MaxLength(CONTACT_MESSAGE_MAX)
  message?: string;
}

/** Admin status flip: unread ⇄ read. */
export class UpdateContactStatusDto {
  @ApiProperty({ enum: ['unread', 'read'], example: 'read' })
  @IsIn(['unread', 'read'])
  status: string;
}
