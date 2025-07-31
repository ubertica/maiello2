// Agent Integration - Updated Routes with All Agents

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertSubscriberSchema, 
  insertContactSchema, 
  insertEventSchema, 
  insertBlogPostSchema,
  insertEbookSchema,
  insertHeroSettingsSchema,
  insertInterviewSchema,
  events,
  blogPosts 
} from "@shared/schema";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import { eq } from "drizzle-orm";
import { upload, handleMulterError } from "./upload";
import path from "path";

// Import Agent Routes
import { registerAuthRoutes, authenticateToken, requireAdmin } from "../agents/auth/routes";
import { registerLeadsAPI } from "../agents/leads-api/routes";
import { registerLeadsSSE } from "../agents/leads-api/sse";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup legacy authentication (keep for existing admin routes)
  setupAuth(app);
  
  // Configurar middleware para el manejo de errores de multer
  app.use(handleMulterError);

  // Agent: Auth - New JWT-based authentication routes
  registerAuthRoutes(app);

  // Agent: Leads API - Lead management endpoints
  app.use(authenticateToken); // Protect all leads routes with JWT
  registerLeadsAPI(app);
  
  // Agent: Leads API - Real-time updates via SSE
  registerLeadsSSE(app);

  // Health check endpoint for monitoring
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      agents: {
        auth: "active",
        leads: "active",
        sse: "active",
        legacy: "active"
      }
    });
  });

  // Agent: AI Score - Proxy endpoints to AI service
  app.post("/api/ai/score/lead", authenticateToken, async (req, res) => {
    try {
      const response = await fetch('http://ai-score:3001/api/score/lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body)
      });
      
      if (!response.ok) {
        throw new Error('AI scoring service unavailable');
      }
      
      const result = await response.json();
      res.json(result);
    } catch (error) {
      console.error('AI scoring error:', error);
      res.status(503).json({ error: 'AI scoring service unavailable' });
    }
  });

  app.post("/api/ai/score/batch", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const response = await fetch('http://ai-score:3001/api/score/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body)
      });
      
      if (!response.ok) {
        throw new Error('AI scoring service unavailable');
      }
      
      const result = await response.json();
      res.json(result);
    } catch (error) {
      console.error('AI batch scoring error:', error);
      res.status(503).json({ error: 'AI scoring service unavailable' });
    }
  });

  app.get("/api/ai/score/stats", authenticateToken, async (req, res) => {
    try {
      const response = await fetch('http://ai-score:3001/api/score/stats');
      
      if (!response.ok) {
        throw new Error('AI scoring service unavailable');
      }
      
      const result = await response.json();
      res.json(result);
    } catch (error) {
      console.error('AI stats error:', error);
      res.status(503).json({ error: 'AI scoring service unavailable' });
    }
  });
  
  // Legacy Public API routes (keep existing functionality)
  
  // Newsletter subscription endpoint
  app.post("/api/subscribe", async (req, res) => {
    try {
      const validatedData = insertSubscriberSchema.parse(req.body);
      
      // Check if subscriber already exists
      const existingSubscriber = await storage.getSubscriberByEmail(validatedData.email);
      
      if (existingSubscriber) {
        return res.status(400).json({ 
          message: "Este email ya está suscrito a nuestro newsletter." 
        });
      }
      
      // Create new subscriber
      const newSubscriber = await storage.createSubscriber(validatedData);
      
      res.status(201).json({ 
        message: "¡Suscripción exitosa!", 
        subscriber: newSubscriber 
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error del servidor" });
      }
    }
  });
  
  // Contact form endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const validatedData = insertContactSchema.parse(req.body);
      
      // Create new contact message
      const newContact = await storage.createContact(validatedData);
      
      res.status(201).json({ 
        message: "¡Mensaje enviado con éxito!",
        contact: newContact
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error del servidor" });
      }
    }
  });
  
  // Get public events
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getEvents();
      res.status(200).json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Error al obtener eventos" });
    }
  });
  
  // Get published blog posts
  app.get("/api/blog", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const posts = await storage.getBlogPosts(limit);
      res.status(200).json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Error al obtener posts del blog" });
    }
  });
  
  // Get ebook information
  app.get("/api/ebook", async (req, res) => {
    try {
      const ebook = await storage.getEbook();
      
      if (!ebook) {
        return res.status(404).json({ message: "E-book no encontrado" });
      }
      
      res.status(200).json(ebook);
    } catch (error) {
      console.error("Error fetching ebook:", error);
      res.status(500).json({ message: "Error al obtener información del e-book" });
    }
  });
  
  // Get single blog post by slug
  app.get("/api/blog/:slug", async (req, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      
      if (!post) {
        return res.status(404).json({ message: "Post no encontrado" });
      }
      
      if (!post.published) {
        return res.status(404).json({ message: "Post no encontrado" });
      }
      
      res.status(200).json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ message: "Error al obtener el post" });
    }
  });
  
  // Legacy Admin API routes (with legacy authentication)
  
  // Protected admin routes
  // Subscribers
  app.get("/api/admin/subscribers", isAdmin, async (req, res) => {
    try {
      const subscribers = await storage.getSubscribers();
      res.status(200).json(subscribers);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      res.status(500).json({ message: "Error al obtener suscriptores" });
    }
  });
  
  app.delete("/api/admin/subscribers/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSubscriber(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Suscriptor no encontrado" });
      }
      
      res.status(200).json({ message: "Suscriptor eliminado con éxito" });
    } catch (error) {
      console.error("Error deleting subscriber:", error);
      res.status(500).json({ message: "Error al eliminar suscriptor" });
    }
  });
  
  // Contacts
  app.get("/api/admin/contacts", isAdmin, async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      res.status(200).json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Error al obtener mensajes de contacto" });
    }
  });
  
  app.get("/api/admin/contacts/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contact = await storage.getContact(id);
      
      if (!contact) {
        return res.status(404).json({ message: "Mensaje no encontrado" });
      }
      
      res.status(200).json(contact);
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ message: "Error al obtener mensaje de contacto" });
    }
  });
  
  app.delete("/api/admin/contacts/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteContact(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Mensaje no encontrado" });
      }
      
      res.status(200).json({ message: "Mensaje eliminado con éxito" });
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ message: "Error al eliminar mensaje" });
    }
  });
  
  // Events management
  app.get("/api/admin/events", isAdmin, async (req, res) => {
    try {
      const events = await storage.getEvents();
      res.status(200).json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Error al obtener eventos" });
    }
  });
  
  app.get("/api/admin/events/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Evento no encontrado" });
      }
      
      res.status(200).json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Error al obtener evento" });
    }
  });
  
  app.post("/api/admin/events", isAdmin, async (req, res) => {
    try {
      const validatedData = insertEventSchema.parse(req.body);
      const newEvent = await storage.createEvent(validatedData);
      
      res.status(201).json({
        message: "Evento creado con éxito",
        event: newEvent
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error del servidor" });
      }
    }
  });
  
  app.put("/api/admin/events/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEventSchema.partial().parse(req.body);
      
      const updatedEvent = await storage.updateEvent(id, validatedData);
      
      if (!updatedEvent) {
        return res.status(404).json({ message: "Evento no encontrado" });
      }
      
      res.status(200).json({
        message: "Evento actualizado con éxito",
        event: updatedEvent
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error del servidor" });
      }
    }
  });
  
  app.delete("/api/admin/events/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEvent(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Evento no encontrado" });
      }
      
      res.status(200).json({ message: "Evento eliminado con éxito" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Error al eliminar evento" });
    }
  });
  
  // Blog management
  app.get("/api/admin/blog", isAdmin, async (req, res) => {
    try {
      const posts = await storage.getBlogPosts(undefined, true);
      res.status(200).json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Error al obtener posts del blog" });
    }
  });
  
  app.get("/api/admin/blog/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getBlogPost(id);
      
      if (!post) {
        return res.status(404).json({ message: "Post no encontrado" });
      }
      
      res.status(200).json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ message: "Error al obtener post del blog" });
    }
  });
  
  app.post("/api/admin/blog", isAdmin, async (req, res) => {
    try {
      const validatedData = insertBlogPostSchema.parse(req.body);
      
      if (!validatedData.authorId && req.user) {
        validatedData.authorId = req.user.id;
      }
      
      const newPost = await storage.createBlogPost(validatedData);
      
      res.status(201).json({
        message: "Post creado con éxito",
        post: newPost
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error del servidor" });
      }
    }
  });
  
  app.put("/api/admin/blog/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertBlogPostSchema.partial().parse(req.body);
      
      const updatedPost = await storage.updateBlogPost(id, validatedData);
      
      if (!updatedPost) {
        return res.status(404).json({ message: "Post no encontrado" });
      }
      
      res.status(200).json({
        message: "Post actualizado con éxito",
        post: updatedPost
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error del servidor" });
      }
    }
  });
  
  app.delete("/api/admin/blog/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteBlogPost(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Post no encontrado" });
      }
      
      res.status(200).json({ message: "Post eliminado con éxito" });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ message: "Error al eliminar post" });
    }
  });
  
  // Ebook management
  app.get("/api/admin/ebook", isAdmin, async (req, res) => {
    try {
      const ebook = await storage.getEbook();
      res.status(200).json(ebook || {});
    } catch (error) {
      console.error("Error fetching ebook:", error);
      res.status(500).json({ message: "Error al obtener información del e-book" });
    }
  });
  
  app.put("/api/admin/ebook", isAdmin, async (req, res) => {
    try {
      const validatedData = insertEbookSchema.partial().parse(req.body);
      
      const updatedEbook = await storage.updateEbook(validatedData);
      
      res.status(200).json({
        message: "E-book actualizado con éxito",
        ebook: updatedEbook
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error del servidor" });
      }
    }
  });
  
  // Site settings
  app.get("/api/admin/settings/:section", isAdmin, async (req, res) => {
    try {
      const section = req.params.section;
      const settings = await storage.getSiteSettings(section);
      
      if (!settings) {
        return res.status(404).json({ message: "Configuración no encontrada" });
      }
      
      res.status(200).json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Error al obtener configuración" });
    }
  });
  
  app.put("/api/admin/settings/:section", isAdmin, async (req, res) => {
    try {
      const section = req.params.section;
      const settings = req.body;
      
      const updatedSettings = await storage.updateSiteSettings(section, settings);
      
      res.status(200).json({
        message: "Configuración actualizada con éxito",
        settings: updatedSettings
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Error al actualizar configuración" });
    }
  });
  
  // Subida de imágenes
  app.post("/api/admin/upload", isAdmin, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No se ha subido ninguna imagen" });
      }
      
      // Construir la URL relativa para la imagen
      const fileUrl = `/uploads/${path.basename(req.file.path)}`;
      
      res.status(200).json({
        message: "Imagen subida con éxito",
        url: fileUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Error al subir la imagen" });
    }
  });
  
  // API pública para Hero settings
  app.get("/api/hero", async (req, res) => {
    try {
      const heroSettings = await storage.getHeroSettings();
      
      if (!heroSettings) {
        return res.status(404).json({ message: "Configuración de hero no encontrada" });
      }
      
      res.status(200).json(heroSettings);
    } catch (error) {
      console.error("Error fetching hero settings:", error);
      res.status(500).json({ message: "Error al obtener configuración de hero" });
    }
  });
  
  // API pública para Entrevistas
  app.get("/api/interviews", async (req, res) => {
    try {
      const interviews = await storage.getInterviews();
      res.status(200).json(interviews);
    } catch (error) {
      console.error("Error fetching interviews:", error);
      res.status(500).json({ message: "Error al obtener entrevistas" });
    }
  });
  
  // Hero settings management
  app.get("/api/admin/hero", isAdmin, async (req, res) => {
    try {
      const heroSettings = await storage.getHeroSettings();
      res.status(200).json(heroSettings || {});
    } catch (error) {
      console.error("Error fetching hero settings:", error);
      res.status(500).json({ message: "Error al obtener configuración de hero" });
    }
  });
  
  app.put("/api/admin/hero", isAdmin, async (req, res) => {
    try {
      const validatedData = insertHeroSettingsSchema.partial().parse(req.body);
      
      const updatedHeroSettings = await storage.updateHeroSettings(validatedData);
      
      res.status(200).json({
        message: "Configuración de hero actualizada con éxito",
        heroSettings: updatedHeroSettings
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error del servidor" });
      }
    }
  });
  
  // Interviews management
  app.get("/api/admin/interviews", isAdmin, async (req, res) => {
    try {
      const interviews = await storage.getInterviews();
      res.status(200).json(interviews);
    } catch (error) {
      console.error("Error fetching interviews:", error);
      res.status(500).json({ message: "Error al obtener entrevistas" });
    }
  });
  
  app.get("/api/admin/interviews/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const interview = await storage.getInterview(id);
      
      if (!interview) {
        return res.status(404).json({ message: "Entrevista no encontrada" });
      }
      
      res.status(200).json(interview);
    } catch (error) {
      console.error("Error fetching interview:", error);
      res.status(500).json({ message: "Error al obtener entrevista" });
    }
  });
  
  app.post("/api/admin/interviews", isAdmin, async (req, res) => {
    try {
      const validatedData = insertInterviewSchema.parse(req.body);
      const newInterview = await storage.createInterview(validatedData);
      
      res.status(201).json({
        message: "Entrevista creada con éxito",
        interview: newInterview
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error del servidor" });
      }
    }
  });
  
  app.put("/api/admin/interviews/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertInterviewSchema.partial().parse(req.body);
      
      const updatedInterview = await storage.updateInterview(id, validatedData);
      
      if (!updatedInterview) {
        return res.status(404).json({ message: "Entrevista no encontrada" });
      }
      
      res.status(200).json({
        message: "Entrevista actualizada con éxito",
        interview: updatedInterview
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error del servidor" });
      }
    }
  });
  
  app.delete("/api/admin/interviews/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteInterview(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Entrevista no encontrada" });
      }
      
      res.status(200).json({ message: "Entrevista eliminada con éxito" });
    } catch (error) {
      console.error("Error deleting interview:", error);
      res.status(500).json({ message: "Error al eliminar entrevista" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}