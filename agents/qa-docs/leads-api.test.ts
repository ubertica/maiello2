// Agent: QA & Docs - API Tests for Leads Management

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { generateTokens } from '../../agents/auth/routes';

const prisma = new PrismaClient();

// Mock Express app for testing
const createTestApp = () => {
  const express = require('express');
  const app = express();
  
  app.use(express.json());
  
  // Register test routes
  const { registerLeadsAPI } = require('../../agents/leads-api/routes');
  const { registerAuthRoutes } = require('../../agents/auth/routes');
  
  registerAuthRoutes(app);
  registerLeadsAPI(app);
  
  return app;
};

describe('Leads API Tests', () => {
  let app;
  let testUser;
  let authToken;

  beforeAll(async () => {
    app = createTestApp();
    
    // Create test user
    testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
        role: 'admin'
      }
    });
    
    // Generate auth token
    const tokens = generateTokens(testUser.id);
    authToken = tokens.accessToken;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.lead.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean leads before each test
    await prisma.lead.deleteMany();
  });

  describe('POST /api/leads', () => {
    test('should create a new lead with valid data', async () => {
      const leadData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        company: 'Test Company',
        jobTitle: 'CEO',
        phone: '+1234567890',
        source: 'website',
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(leadData)
        .expect(201);

      expect(response.body).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        company: 'Test Company',
        jobTitle: 'CEO'
      });

      // Verify lead was created in database
      const createdLead = await prisma.lead.findUnique({
        where: { email: 'john.doe@example.com' }
      });
      
      expect(createdLead).toBeTruthy();
      expect(createdLead.firstName).toBe('John');
    });

    test('should return 400 for invalid email', async () => {
      const leadData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        source: 'website'
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(leadData)
        .expect(400);

      expect(response.body.error).toBe('Invalid lead data');
    });

    test('should return 400 for duplicate email', async () => {
      // Create initial lead
      await prisma.lead.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'duplicate@example.com',
          source: 'website'
        }
      });

      const leadData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'duplicate@example.com',
        source: 'website'
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(leadData)
        .expect(400);

      expect(response.body.error).toBe('Lead with this email already exists');
    });
  });

  describe('GET /api/leads', () => {
    beforeEach(async () => {
      // Create test leads
      await prisma.lead.createMany({
        data: [
          {
            firstName: 'Alice',
            lastName: 'Johnson',
            email: 'alice@example.com',
            company: 'Tech Corp',
            status: 'new',
            source: 'website',
            priority: 'high'
          },
          {
            firstName: 'Bob',
            lastName: 'Wilson',
            email: 'bob@example.com',
            company: 'Design Studio',
            status: 'contacted',
            source: 'referral',
            priority: 'medium'
          },
          {
            firstName: 'Charlie',
            lastName: 'Brown',
            email: 'charlie@example.com',
            company: 'Marketing Inc',
            status: 'qualified',
            source: 'social_media',
            priority: 'low'
          }
        ]
      });
    });

    test('should return paginated leads', async () => {
      const response = await request(app)
        .get('/api/leads?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.leads).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        pages: 2
      });
    });

    test('should filter leads by status', async () => {
      const response = await request(app)
        .get('/api/leads?status=contacted')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.leads).toHaveLength(1);
      expect(response.body.leads[0].status).toBe('contacted');
    });

    test('should search leads by name', async () => {
      const response = await request(app)
        .get('/api/leads?search=Alice')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.leads).toHaveLength(1);
      expect(response.body.leads[0].firstName).toBe('Alice');
    });

    test('should sort leads by specified field', async () => {
      const response = await request(app)
        .get('/api/leads?sortBy=firstName&sortOrder=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const names = response.body.leads.map(lead => lead.firstName);
      expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
    });
  });

  describe('GET /api/leads/:id', () => {
    test('should return lead by ID', async () => {
      const lead = await prisma.lead.create({
        data: {
          firstName: 'Test',
          lastName: 'Lead',
          email: 'test@example.com',
          source: 'website'
        }
      });

      const response = await request(app)
        .get(`/api/leads/${lead.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(lead.id);
      expect(response.body.firstName).toBe('Test');
    });

    test('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .get('/api/leads/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Lead not found');
    });

    test('should return 400 for invalid ID', async () => {
      const response = await request(app)
        .get('/api/leads/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBe('Invalid lead ID');
    });
  });

  describe('PUT /api/leads/:id', () => {
    test('should update lead with valid data', async () => {
      const lead = await prisma.lead.create({
        data: {
          firstName: 'Original',
          lastName: 'Name',
          email: 'original@example.com',
          source: 'website'
        }
      });

      const updateData = {
        firstName: 'Updated',
        company: 'New Company',
        priority: 'high'
      };

      const response = await request(app)
        .put(`/api/leads/${lead.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.firstName).toBe('Updated');
      expect(response.body.company).toBe('New Company');
      expect(response.body.priority).toBe('high');
    });

    test('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .put('/api/leads/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Updated' })
        .expect(404);

      expect(response.body.error).toBe('Lead not found');
    });
  });

  describe('DELETE /api/leads/:id', () => {
    test('should delete lead successfully', async () => {
      const lead = await prisma.lead.create({
        data: {
          firstName: 'Delete',
          lastName: 'Me',
          email: 'delete@example.com',
          source: 'website'
        }
      });

      const response = await request(app)
        .delete(`/api/leads/${lead.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Lead deleted successfully');

      // Verify lead was deleted
      const deletedLead = await prisma.lead.findUnique({
        where: { id: lead.id }
      });
      expect(deletedLead).toBeNull();
    });

    test('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .delete('/api/leads/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Lead not found');
    });
  });

  describe('Authentication', () => {
    test('should require authentication token', async () => {
      const response = await request(app)
        .get('/api/leads')
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.error).toBe('Invalid or expired token');
    });
  });
});