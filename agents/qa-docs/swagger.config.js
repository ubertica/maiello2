// Agent: QA & Docs - Swagger/OpenAPI Configuration

module.exports = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Maiello2 Lead Management API',
      version: '1.0.0',
      description: 'Comprehensive Lead Management System with AI-powered scoring',
      contact: {
        name: 'API Support',
        email: 'support@maiello.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.maiello.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Lead: {
          type: 'object',
          required: ['firstName', 'lastName', 'email'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the lead'
            },
            firstName: {
              type: 'string',
              description: 'First name of the lead'
            },
            lastName: {
              type: 'string',
              description: 'Last name of the lead'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address of the lead'
            },
            phone: {
              type: 'string',
              description: 'Phone number of the lead'
            },
            company: {
              type: 'string',
              description: 'Company name'
            },
            jobTitle: {
              type: 'string',
              description: 'Job title of the lead'
            },
            status: {
              type: 'string',
              enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'nurturing'],
              description: 'Current status of the lead'
            },
            source: {
              type: 'string',
              enum: ['website', 'social_media', 'referral', 'advertising', 'trade_show', 'cold_call', 'email_campaign', 'partner', 'organic_search', 'paid_search', 'other'],
              description: 'Source of the lead'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Priority level of the lead'
            },
            budget: {
              type: 'number',
              minimum: 0,
              description: 'Expected budget in USD'
            },
            probability: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'Probability of closing (percentage)'
            },
            aiScore: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'AI-generated lead score'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of tags associated with the lead'
            },
            notes: {
              type: 'string',
              description: 'Additional notes about the lead'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date and time when the lead was created'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date and time when the lead was last updated'
            }
          }
        },
        User: {
          type: 'object',
          required: ['username', 'email'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the user'
            },
            username: {
              type: 'string',
              description: 'Username for authentication'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address'
            },
            name: {
              type: 'string',
              description: 'Full name of the user'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role for authorization'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date and time when the user was created'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              description: 'Username for authentication'
            },
            password: {
              type: 'string',
              description: 'Password for authentication'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message'
            },
            user: {
              $ref: '#/components/schemas/User'
            },
            accessToken: {
              type: 'string',
              description: 'JWT access token'
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Detailed validation errors'
            }
          }
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number'
            },
            limit: {
              type: 'integer',
              description: 'Number of items per page'
            },
            total: {
              type: 'integer',
              description: 'Total number of items'
            },
            pages: {
              type: 'integer',
              description: 'Total number of pages'
            }
          }
        },
        LeadsResponse: {
          type: 'object',
          properties: {
            leads: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Lead'
              }
            },
            pagination: {
              $ref: '#/components/schemas/PaginationResponse'
            },
            filters: {
              type: 'object',
              description: 'Applied filters'
            }
          }
        },
        AIScoreResponse: {
          type: 'object',
          properties: {
            leadId: {
              type: 'integer',
              description: 'ID of the scored lead'
            },
            score: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'AI-generated score'
            },
            breakdown: {
              type: 'object',
              properties: {
                score: {
                  type: 'number',
                  description: 'Overall score'
                },
                segments: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Lead segments'
                },
                reasoning: {
                  type: 'string',
                  description: 'Explanation of the score'
                },
                recommendations: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Recommended actions'
                },
                riskFactors: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Identified risk factors'
                },
                opportunities: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Identified opportunities'
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './server/routes.js',
    './agents/auth/routes.js',
    './agents/leads-api/routes.js',
    './agents/ai-score/index.js'
  ]
};