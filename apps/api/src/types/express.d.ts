// Express request augmentation.
//
// `requireAuth` sets `req.user`; without this declaration every middleware and
// handler would need a cast.

import type { Role } from "@qroute/shared";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
    }
  }
}

export {};
