// Agent: Leads API - Core Leads Management Endpoints

import type { Express, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { createObjectCsvWriter } from "csv-writer";
import csvParser from "csv-parser";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

const prisma = new PrismaClient();

// Zod schemas for validation
const LeadCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'nurturing']).default('new'),
  source: z.enum(['website', 'social_media', 'referral', 'advertising', 'trade_show', 'cold_call', 'email_campaign', 'partner', 'organic_search', 'paid_search', 'other']).default('website'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  budget: z.number().positive().optional(),
  expectedCloseDate: z.string().datetime().optional(),
  probability: z.number().min(0).max(100).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.any()).optional(),
  assignedToId: z.number().positive().optional(),
  nextFollowUpAt: z.string().datetime().optional()
});

const LeadUpdateSchema = LeadCreateSchema.partial();

const LeadQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  status: z.string().optional(),
  source: z.string().optional(),
  priority: z.string().optional(),
  assignedToId: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'firstName', 'lastName', 'company', 'aiScore']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  tags: z.string().optional(), // Comma-separated tags
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

export function registerLeadsAPI(app: Express) {
  // Get all leads with filtering, pagination, and search
  app.get("/api/leads", async (req: Request, res: Response) => {
    try {
      const query = LeadQuerySchema.parse(req.query);
      
      const where: any = {};
      
      // Apply filters
      if (query.status) {
        where.status = query.status;
      }
      
      if (query.source) {
        where.source = query.source;
      }
      
      if (query.priority) {
        where.priority = query.priority;
      }
      
      if (query.assignedToId) {
        where.assignedToId = query.assignedToId;
      }
      
      if (query.search) {
        where.OR = [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { company: { contains: query.search, mode: 'insensitive' } }
        ];
      }
      
      if (query.tags) {
        const tags = query.tags.split(',').map(tag => tag.trim());
        where.tags = {
          hasSome: tags
        };
      }
      
      if (query.dateFrom || query.dateTo) {
        where.createdAt = {};
        if (query.dateFrom) {
          where.createdAt.gte = new Date(query.dateFrom);
        }
        if (query.dateTo) {
          where.createdAt.lte = new Date(query.dateTo);
        }
      }
      
      // Calculate pagination
      const skip = (query.page - 1) * query.limit;
      
      // Get total count for pagination
      const total = await prisma.lead.count({ where });
      
      // Get leads with pagination and sorting
      const leads = await prisma.lead.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true }
          },
          activities: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              activities: true,
              documents: true
            }
          }
        },
        orderBy: {
          [query.sortBy]: query.sortOrder
        },
        skip,
        take: query.limit
      });
      
      res.json({
        leads,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit)
        },
        filters: {
          status: query.status,
          source: query.source,
          priority: query.priority,
          assignedToId: query.assignedToId,
          search: query.search,
          tags: query.tags
        }
      });
    } catch (error) {
      console.error("Error fetching leads:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Get single lead by ID
  app.get("/api/leads/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid lead ID" });
      }
      
      const lead = await prisma.lead.findUnique({
        where: { id },
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true }
          },
          activities: {
            orderBy: { createdAt: 'desc' }
          },
          documents: true
        }
      });
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create new lead
  app.post("/api/leads", async (req: Request, res: Response) => {
    try {
      const data = LeadCreateSchema.parse(req.body);
      
      // Check if email already exists
      const existingLead = await prisma.lead.findUnique({
        where: { email: data.email }
      });
      
      if (existingLead) {
        return res.status(400).json({ error: "Lead with this email already exists" });
      }
      
      const lead = await prisma.lead.create({
        data: {
          ...data,
          expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
          nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null
        },
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      
      // Trigger AI scoring asynchronously (if AI Score agent is available)
      // This could be a webhook call or message queue
      
      res.status(201).json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid lead data", details: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Update lead
  app.put("/api/leads/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid lead ID" });
      }
      
      const data = LeadUpdateSchema.parse(req.body);
      
      // Check if lead exists
      const existingLead = await prisma.lead.findUnique({
        where: { id }
      });
      
      if (!existingLead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      // Check email uniqueness if email is being updated
      if (data.email && data.email !== existingLead.email) {
        const emailExists = await prisma.lead.findUnique({
          where: { email: data.email }
        });
        
        if (emailExists) {
          return res.status(400).json({ error: "Lead with this email already exists" });
        }
      }
      
      const lead = await prisma.lead.update({
        where: { id },
        data: {
          ...data,
          expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
          nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : undefined,
          lastContactedAt: new Date() // Update last contacted timestamp
        },
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid lead data", details: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Delete lead
  app.delete("/api/leads/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid lead ID" });
      }
      
      // Check if lead exists
      const existingLead = await prisma.lead.findUnique({
        where: { id }
      });
      
      if (!existingLead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      await prisma.lead.delete({
        where: { id }
      });
      
      res.json({ message: "Lead deleted successfully" });
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Export leads to CSV
  app.get("/api/leads/export/csv", async (req: Request, res: Response) => {
    try {
      const query = LeadQuerySchema.parse(req.query);
      
      // Build where clause (same as GET /api/leads)
      const where: any = {};
      
      if (query.status) where.status = query.status;
      if (query.source) where.source = query.source;
      if (query.priority) where.priority = query.priority;
      if (query.assignedToId) where.assignedToId = query.assignedToId;
      
      if (query.search) {
        where.OR = [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { company: { contains: query.search, mode: 'insensitive' } }
        ];
      }
      
      if (query.tags) {
        const tags = query.tags.split(',').map(tag => tag.trim());
        where.tags = { hasSome: tags };
      }
      
      if (query.dateFrom || query.dateTo) {
        where.createdAt = {};
        if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
        if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
      }
      
      // Get all leads matching criteria (no pagination for export)
      const leads = await prisma.lead.findMany({
        where,
        include: {
          assignedTo: {
            select: { name: true, email: true }
          }
        },
        orderBy: { [query.sortBy]: query.sortOrder }
      });
      
      // Create CSV file
      const csvFilePath = path.join(process.cwd(), 'tmp', `leads-export-${Date.now()}.csv`);
      
      // Ensure tmp directory exists
      const tmpDir = path.dirname(csvFilePath);
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      
      const csvWriter = createObjectCsvWriter({
        path: csvFilePath,
        header: [
          { id: 'id', title: 'ID' },
          { id: 'firstName', title: 'First Name' },
          { id: 'lastName', title: 'Last Name' },
          { id: 'email', title: 'Email' },
          { id: 'phone', title: 'Phone' },
          { id: 'company', title: 'Company' },
          { id: 'jobTitle', title: 'Job Title' },
          { id: 'status', title: 'Status' },
          { id: 'source', title: 'Source' },
          { id: 'priority', title: 'Priority' },
          { id: 'budget', title: 'Budget' },
          { id: 'probability', title: 'Probability' },
          { id: 'assignedTo', title: 'Assigned To' },
          { id: 'aiScore', title: 'AI Score' },
          { id: 'createdAt', title: 'Created At' },
          { id: 'updatedAt', title: 'Updated At' }
        ]
      });
      
      // Transform data for CSV
      const csvData = leads.map(lead => ({
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone || '',
        company: lead.company || '',
        jobTitle: lead.jobTitle || '',
        status: lead.status,
        source: lead.source,
        priority: lead.priority,
        budget: lead.budget || '',
        probability: lead.probability || '',
        assignedTo: lead.assignedTo?.name || '',
        aiScore: lead.aiScore || '',
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString()
      }));
      
      await csvWriter.writeRecords(csvData);
      
      // Send file
      res.download(csvFilePath, `leads-export-${new Date().toISOString().split('T')[0]}.csv`, (err) => {
        if (err) {
          console.error("Error sending CSV file:", err);
          res.status(500).json({ error: "Error generating CSV file" });
        }
        
        // Clean up file after sending
        fs.unlink(csvFilePath, (unlinkErr) => {
          if (unlinkErr) console.error("Error cleaning up CSV file:", unlinkErr);
        });
      });
    } catch (error) {
      console.error("Error exporting leads:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Import leads from CSV
  app.post("/api/leads/import/csv", async (req: Request, res: Response) => {
    // This would typically handle file upload via multer
    // For now, we'll assume the file is already uploaded
    
    try {
      const filePath = req.body.filePath; // Path to uploaded CSV file
      
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(400).json({ error: "CSV file not found" });
      }
      
      const leads: any[] = [];
      const errors: string[] = [];
      let rowNumber = 0;
      
      // Parse CSV file
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (row) => {
            rowNumber++;
            
            try {
              // Validate and transform row data
              const leadData = {
                firstName: row['First Name'] || row.firstName,
                lastName: row['Last Name'] || row.lastName,
                email: row['Email'] || row.email,
                phone: row['Phone'] || row.phone || undefined,
                company: row['Company'] || row.company || undefined,
                jobTitle: row['Job Title'] || row.jobTitle || undefined,
                status: row['Status'] || row.status || 'new',
                source: row['Source'] || row.source || 'other',
                priority: row['Priority'] || row.priority || 'medium',
                budget: row['Budget'] || row.budget ? parseFloat(row['Budget'] || row.budget) : undefined,
                probability: row['Probability'] || row.probability ? parseInt(row['Probability'] || row.probability) : undefined,
                notes: row['Notes'] || row.notes || undefined
              };
              
              // Validate with Zod schema
              const validatedLead = LeadCreateSchema.parse(leadData);
              leads.push(validatedLead);
            } catch (error) {
              errors.push(`Row ${rowNumber}: ${error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : 'Invalid data'}`);
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });
      
      // If there are validation errors, return them
      if (errors.length > 0) {
        return res.status(400).json({
          error: "CSV validation failed",
          errors,
          processedRows: rowNumber
        });
      }
      
      // Bulk insert leads
      const createdLeads = await prisma.lead.createMany({
        data: leads,
        skipDuplicates: true // Skip leads with duplicate emails
      });
      
      // Clean up uploaded file
      fs.unlink(filePath, (err) => {
        if (err) console.error("Error cleaning up uploaded file:", err);
      });
      
      res.json({
        message: "Leads imported successfully",
        imported: createdLeads.count,
        total: leads.length,
        skipped: leads.length - createdLeads.count
      });
    } catch (error) {
      console.error("Error importing leads:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

export default registerLeadsAPI;