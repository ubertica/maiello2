# Maiello2 - Agent-Based Lead Management System

A comprehensive lead management platform organized into specialized agents, each handling specific aspects of the system. This architecture enables parallel development, maintainability, and scalability.

## 🏗️ Agent-Based Architecture

The system is organized into 8 specialized agents, each with clear responsibilities:

### 🚀 Agente "Infra & CI"
**Location**: `/agents/infra-ci/`, Docker files, GitHub Actions  
**Responsibility**: Infrastructure, containerization, and continuous integration/deployment

**Features**:
- Complete Docker Compose setup with PostgreSQL, Redis, Nginx
- Multi-stage Dockerfiles for production and development
- Comprehensive GitHub Actions CI/CD pipeline
- Automated testing, building, and deployment workflows
- Environment configuration and secrets management

**Key Files**:
- `docker-compose.yml` - Multi-service development environment
- `Dockerfile` & `Dockerfile.dev` - Container configurations
- `.github/workflows/ci-cd.yml` - Complete CI/CD pipeline

### 📊 Agente "Data & ORM"
**Location**: `/agents/data-orm/`  
**Responsibility**: Database schema, migrations, and data seeding

**Features**:
- Complete Prisma schema with 15+ models
- Comprehensive data relationships and constraints
- Database seeding with realistic test data
- Migration management and versioning
- Support for PostgreSQL with optimized queries

**Key Files**:
- `schema.prisma` - Complete database schema
- `seed.js` - Comprehensive data seeding script

**Models Include**:
- Users with role-based access control
- Leads with AI scoring capabilities
- Lead activities and document management
- Subscription plans and billing
- Blog posts and content management
- Events and newsletter management

### 🔐 Agente "Auth"
**Location**: `/agents/auth/`  
**Responsibility**: Authentication, authorization, and user management

**Features**:
- JWT-based authentication with refresh tokens
- Password hashing with bcrypt (12 rounds)
- Password reset via email tokens
- Role-based access control (user/admin)
- Comprehensive input validation with Zod
- Secure middleware for route protection

**Key Files**:
- `routes.ts` - Complete authentication API

**Endpoints**:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### 📝 Agente "Leads API"
**Location**: `/agents/leads-api/`  
**Responsibility**: Lead management backend with real-time capabilities

**Features**:
- Complete CRUD operations for leads
- Advanced filtering, pagination, and search
- CSV import/export functionality
- Real-time updates via Server-Sent Events (SSE)
- Comprehensive validation and error handling
- AI scoring integration points

**Key Files**:
- `routes.ts` - Lead management endpoints
- `sse.ts` - Real-time updates via SSE

**Endpoints**:
- `GET /api/leads` - List leads with filtering/pagination
- `POST /api/leads` - Create new lead
- `GET /api/leads/:id` - Get single lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `GET /api/leads/export/csv` - Export to CSV
- `POST /api/leads/import/csv` - Import from CSV
- `GET /api/leads/stream` - SSE for real-time updates

### 🎨 Agente "UI Leads"
**Location**: `/client/src/pages/leads/`, `/client/src/components/leads/`  
**Responsibility**: React-based lead management interface

**Features**:
- Interactive data table with sorting and pagination
- Advanced filtering interface
- Real-time updates without polling
- Responsive design with Tailwind CSS
- Comprehensive lead form with validation
- Export functionality and bulk operations

**Key Components**:
- `index.tsx` - Main leads management page
- `data-table.tsx` - Interactive data table
- `lead-form.tsx` - Lead creation/editing form
- `lead-filters.tsx` - Advanced filtering interface

**UI Features**:
- Live data updates via SSE
- Smart pagination and sorting
- Tag-based filtering and search
- Mobile-responsive design
- Accessible components with proper ARIA labels

### 🎯 Agente "Admin Panel"
**Location**: `/client/src/pages/admin/`, existing admin routes  
**Responsibility**: Administrative interface and subscription management

**Features** (Existing + Planned):
- User management interface
- Subscription plan management
- Stripe payment integration
- Content management (blog, events)
- Settings and configuration
- Analytics and reporting

### 🧪 Agente "QA & Docs"
**Location**: `/agents/qa-docs/`  
**Responsibility**: Testing, documentation, and quality assurance

**Features**:
- Jest configuration for unit/integration tests
- Comprehensive API test suite
- ESLint configuration for code quality
- Swagger/OpenAPI documentation
- Test fixtures and mocks
- Coverage reporting

**Key Files**:
- `jest.setup.ts` - Test environment configuration
- `leads-api.test.ts` - Comprehensive API tests
- `swagger.config.js` - API documentation configuration
- `jest.config.js` - Jest configuration
- `.eslintrc.js` - Code quality rules

### 🤖 Agente "AI Score"
**Location**: `/agents/ai-score/`  
**Responsibility**: AI-powered lead scoring and segmentation

**Features**:
- GPT-4 integration for intelligent lead analysis
- Rule-based fallback scoring system
- Batch processing capabilities
- Lead segmentation and recommendations
- Risk factor identification
- Performance monitoring and statistics

**Key Files**:
- `index.js` - Main AI scoring service
- `package.json` - Service dependencies
- `Dockerfile` - Service containerization

**Endpoints**:
- `POST /api/score/lead` - Score single lead
- `POST /api/score/batch` - Batch score multiple leads
- `GET /api/score/stats` - Scoring statistics
- `POST /api/score/webhook/new-lead` - Auto-score new leads

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL (or use Docker)

### Development Setup

1. **Clone and Install**:
```bash
git clone <repository-url>
cd maiello2
npm install
```

2. **Environment Variables**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start with Docker**:
```bash
# Start all services
docker-compose up -d

# Or start only database
docker-compose up postgres redis -d

# Run application locally
npm run dev
```

4. **Database Setup**:
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed test data
npm run db:seed
```

5. **AI Score Service** (Optional):
```bash
# Start AI scoring service
docker-compose --profile ai up ai-score -d
```

### Production Deployment

```bash
# Build and deploy
docker-compose --profile production up -d
```

## 📁 Project Structure

```
maiello2/
├── agents/                    # Agent-specific code
│   ├── infra-ci/             # Infrastructure & CI
│   ├── data-orm/             # Database & ORM
│   ├── auth/                 # Authentication
│   ├── leads-api/            # Leads API
│   ├── admin-panel/          # Admin interface
│   ├── qa-docs/              # Testing & docs
│   └── ai-score/             # AI scoring service
├── client/                   # React frontend
│   ├── src/
│   │   ├── pages/leads/      # Lead management UI
│   │   └── components/leads/ # Lead components
├── server/                   # Express backend
├── shared/                   # Shared schemas
├── .github/workflows/        # CI/CD pipelines
├── docker-compose.yml        # Service orchestration
└── package.json              # Dependencies & scripts
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev                   # Start development server
npm run check                 # TypeScript type checking

# Database
npm run db:generate          # Generate Prisma client
npm run db:migrate           # Run database migrations
npm run db:seed              # Seed test data

# Testing
npm test                     # Run unit tests
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report
npm run test:e2e            # End-to-end tests

# Quality
npm run lint                 # ESLint checking
npm run lint:fix            # Fix ESLint issues

# Documentation
npm run docs:generate       # Generate API documentation

# Production
npm run build               # Build for production
npm start                   # Start production server
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/maiello_db"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# AI Scoring
OPENAI_API_KEY="your-openai-api-key"

# Email (for password reset)
SENDGRID_API_KEY="your-sendgrid-key"
FROM_EMAIL="noreply@maiello.com"

# Application
NODE_ENV="development"
PORT="5000"
BASE_URL="http://localhost:5000"
```

### Service URLs

- **Main Application**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs
- **AI Score Service**: http://localhost:3001
- **Database**: localhost:5432
- **Redis**: localhost:6379

## 📚 API Documentation

The API is fully documented with Swagger/OpenAPI. Access the interactive documentation at:
- Development: http://localhost:5000/api-docs
- Production: https://api.maiello.com/api-docs

### Key API Endpoints

**Authentication**:
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

**Leads Management**:
- `GET /api/leads` - List leads (with filtering/pagination)
- `POST /api/leads` - Create lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `GET /api/leads/export/csv` - Export to CSV

**Real-time Updates**:
- `GET /api/leads/stream` - Server-Sent Events

**AI Scoring**:
- `POST /api/ai/score/lead` - Score single lead
- `POST /api/ai/score/batch` - Batch scoring

## 🧪 Testing

The project includes comprehensive testing at multiple levels:

### Unit & Integration Tests
```bash
npm test                     # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
```

### API Testing
Comprehensive test suite for all endpoints:
- Authentication flows
- CRUD operations
- Filtering and pagination
- Error handling
- Validation

### Test Data
Use the seeding script to create test data:
```bash
npm run db:seed
```

**Default Admin User**:
- Username: `admin`
- Password: `admin123`
- Email: `admin@maiello.com`

## 🔄 Real-time Features

The system supports real-time updates via Server-Sent Events (SSE):

### Client-side Usage
```javascript
const eventSource = new EventSource('/api/leads/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'lead_created':
      // Handle new lead
      break;
    case 'lead_updated':
      // Handle lead update
      break;
    case 'lead_score_updated':
      // Handle AI score update
      break;
  }
};
```

### Supported Events
- `lead_created` - New lead added
- `lead_updated` - Lead modified
- `lead_deleted` - Lead removed
- `lead_activity_added` - New activity
- `lead_score_updated` - AI score updated

## 🤖 AI Scoring

The AI scoring system provides intelligent lead qualification:

### Features
- **GPT-4 Integration**: Advanced AI analysis
- **Rule-based Fallback**: Reliable backup scoring
- **Batch Processing**: Score multiple leads
- **Real-time Updates**: Automatic score updates

### Scoring Factors
- Job title and seniority
- Company size and industry
- Budget and timeline
- Source quality
- Engagement level
- Information completeness

### Usage
```bash
# Score a single lead
curl -X POST /api/ai/score/lead \
  -H "Content-Type: application/json" \
  -d '{"leadId": 123}'

# Batch scoring
curl -X POST /api/ai/score/batch \
  -H "Content-Type: application/json" \
  -d '{"leadIds": [123, 124, 125]}'
```

## 🔐 Security

### Authentication & Authorization
- JWT tokens with expiration
- Password hashing with bcrypt (12 rounds)
- Role-based access control
- Secure password reset flow

### API Security
- Input validation with Zod schemas
- Rate limiting (configured in production)
- CORS protection
- SQL injection prevention (Prisma ORM)

### Environment Security
- Environment variable validation
- Secrets management
- Container security best practices

## 📈 Performance

### Database Optimization
- Indexed queries for fast search
- Efficient pagination
- Connection pooling
- Query optimization

### Frontend Performance
- React Query for caching
- Server-side pagination
- Lazy loading components
- Optimized bundle size

### Real-time Efficiency
- SSE instead of polling
- Connection management
- Event filtering
- Automatic reconnection

## 🚀 Deployment

### Docker Deployment
```bash
# Production build
docker-compose --profile production up -d

# With AI service
docker-compose --profile ai --profile production up -d
```

### Environment-specific Configs
- Development: Full logging, hot reload
- Production: Optimized builds, monitoring
- Testing: Isolated database, mocked services

## 🤝 Contributing

### Agent Development
1. Choose an agent to work on
2. Create feature branch: `git checkout -b agent/leads-api/new-feature`
3. Implement changes within agent boundaries
4. Add tests for new functionality
5. Update documentation
6. Submit pull request

### Code Quality
- Follow ESLint rules
- Maintain test coverage >80%
- Use TypeScript strictly
- Document complex logic

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: Check this README and API docs
- **Issues**: Create GitHub issues for bugs/features
- **Testing**: Run `npm test` for validation
- **Logs**: Check Docker logs for debugging

---

Built with ❤️ using the Agent-Based Architecture pattern for scalable lead management.