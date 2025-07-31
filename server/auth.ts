import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { InsertUser, userRoleEnum } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      name?: string;
      email?: string;
      role: string;
      password: string;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "No autorizado" });
}

export function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({ error: "Acceso prohibido" });
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "session-secret-temp-dev-only",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configurar la estrategia de autenticación local
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: "Usuario no encontrado" });
        }
        
        const isValid = await comparePasswords(password, user.password);
        
        if (!isValid) {
          return done(null, false, { message: "Contraseña incorrecta" });
        }
        
        return done(null, user as any);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user as any);
    } catch (error) {
      done(error);
    }
  });

  // Crear un usuario admin si no existe
  createAdminUserIfNeeded();

  // Rutas de autenticación
  app.post("/api/admin/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: info.message || "Credenciales inválidas" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "No tienes permisos de administrador" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.status(200).json({ user, message: "Inicio de sesión exitoso" });
      });
    })(req, res, next);
  });

  app.post("/api/admin/logout", isAuthenticated, (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Error al cerrar sesión" });
      }
      res.status(200).json({ message: "Sesión cerrada correctamente" });
    });
  });

  app.get("/api/admin/session", (req, res) => {
    if (req.isAuthenticated() && req.user.role === "admin") {
      // No enviar la contraseña al cliente
      const { password, ...userWithoutPassword } = req.user;
      res.json({ authenticated: true, user: userWithoutPassword });
    } else {
      res.json({ authenticated: false, user: null });
    }
  });
}

async function createAdminUserIfNeeded() {
  try {
    // Verificar si ya existe un usuario admin
    const adminUser = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
    
    if (adminUser.length === 0) {
      // Crear usuario admin por defecto
      const adminUserData: InsertUser = {
        username: "admin",
        password: await hashPassword("123456"),
        name: "Administrador",
        email: "admin@example.com",
        role: "admin",
      };
      
      await storage.createUser(adminUserData);
      console.log("Usuario administrador creado correctamente");
    }
  } catch (error) {
    console.error("Error al crear usuario administrador:", error);
  }
}