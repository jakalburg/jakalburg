import { ApiProperty } from '@nestjs/swagger';

/** A single successfully uploaded image. */
export class UploadedImageDto {
  @ApiProperty({ description: 'Secure Cloudinary delivery URL.' })
  url: string;

  @ApiProperty({ description: 'Cloudinary public id (for later deletion).' })
  publicId: string;
}

/** A single file that failed to upload, with the reason. */
export class FailedUploadDto {
  @ApiProperty()
  fileName: string;

  @ApiProperty()
  error: string;
}

/** Response for a (possibly batched) image upload. */
export class ImageUploadResponseDto {
  @ApiProperty({ type: [UploadedImageDto] })
  uploaded: UploadedImageDto[];

  @ApiProperty({ type: [FailedUploadDto] })
  failed: FailedUploadDto[];

  @ApiProperty()
  totalUploaded: number;

  @ApiProperty()
  totalFailed: number;
}
