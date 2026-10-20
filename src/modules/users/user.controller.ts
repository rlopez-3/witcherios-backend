import { Request, Response, NextFunction } from "express";
import { UserService } from "./user.service";

export class UserController {
  constructor(private userService: UserService) {}

  sync = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const { uid, email, name, picture } = req.user;
      const user = await this.userService.syncUser(
        uid,
        email || "",
        name || req.body.displayName,
        picture || req.body.photoURL,
      );

      return res.json(user);
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ message: "No autorizado" });

      const profile = await this.userService.getProfile(req.user.uid);
      if (!profile)
        return res.status(404).json({ message: "Perfil no encontrado" });

      return res.json(profile);
    } catch (error) {
      next(error);
    }
  };

  updateMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ message: "No autorizado" });

      const updatedProfile = await this.userService.updateProfile(
        req.user.uid,
        req.body,
      );
      return res.json(updatedProfile);
    } catch (error) {
      next(error);
    }
  };
}
