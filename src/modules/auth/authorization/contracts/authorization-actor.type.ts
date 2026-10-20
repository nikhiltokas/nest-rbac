import type { PublicUser } from '../../credentials/contracts/credentials.types.js';

export type AuthorizationActor = Pick<PublicUser, 'id' | 'role'>;
