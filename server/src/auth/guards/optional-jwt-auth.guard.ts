import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Return null instead of throwing when there is no/invalid token.
  handleRequest(err: any, user: any) {
    return user || null;
  }
}
