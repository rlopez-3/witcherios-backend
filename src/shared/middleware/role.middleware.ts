import { Request, Response, NextFunction } from "express";

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role || "customer";

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "Acceso denegado.",
      });
    }

    next();
  };
}
