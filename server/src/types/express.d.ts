export {};

import type { UserDocument } from '../models/User.model.js';
import type { OrganizationDocument } from '../models/Organization.model.js';
import type { OrganizationMembershipDocument } from '../models/OrganizationMembership.model.js';
import type { Permission } from '@clientflow/shared';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: UserDocument;
      organization?: OrganizationDocument;
      membership?: OrganizationMembershipDocument;
      permissions?: Permission[];
    }
  }
}
