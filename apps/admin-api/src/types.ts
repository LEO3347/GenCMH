import type { AdminUser, Permission, Role } from "@prisma/client";

export type AuthUser = AdminUser & {
  role: Role & {
    permissions: {
      permission: Permission;
    }[];
  };
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
