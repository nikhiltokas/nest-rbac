import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants/auth-metadata.constant.js';

/** Skips JWT authentication only when the route has no permission or role requirements. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
