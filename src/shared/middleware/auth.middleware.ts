import { Request, Response, NextFunction } from "express";
import { auth } from "@config/firebase";

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Acceso no autorizado: Token ausente" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    return next();
  } catch (error) {
    console.error("Error al verificar token de Firebase:", error);
    return res.status(403).json({ message: "Token inválido o expirado" });
  }
}
