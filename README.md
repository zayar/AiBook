# 🚀 Cashflow Copilot - AI-First Bookkeeping SaaS

A headless, multi-tenant, multi-currency bookkeeping SaaS built on Google Cloud Platform with AI-powered features.

## ⚡ Quick Start

Get started in under 2 minutes:

```bash
# Clone and setup
git clone <repository-url>
cd AiBook

# Start everything (includes database setup)
npm run dev:all
```

**Access your application:**
- Frontend: http://localhost:3001
- Backend: http://localhost:3000

👉 **[Complete Quick Start Guide](QUICK_START.md)** | **[Configuration Guide](CONFIGURATION_SAVED.md)**

## 🚀 Features

- **Double-Entry Accounting**: Built on proven accounting principles with ALE-inspired architecture ✅
- **Enhanced Multi-Tenancy**: Advanced tenant isolation with automatic filtering and context management ✅
- **Firebase Authentication**: Comprehensive user management with role-based access control ✅
- **Multi-Currency Support**: Handle multiple currencies with automatic conversion ✅
- **AI Integration**: Vertex AI for transaction categorization and OCR ✅
- **Predictive Analytics**: BigQuery ML for cash flow forecasting ✅
- **MCP Integration**: Agent-tool interactions for AI workflows ✅
- **Real-time**: Redis caching and real-time updates ✅
- **Modern AI-Powered UI**: React/Next.js frontend with AI chat and transaction forms ✅
- **Comprehensive Testing**: Jest unit and integration tests ✅
- **Production Deployment**: Dockerized and ready for Google Cloud Run ✅

## 🛠 Tech Stack

- **Backend**: Node.js, Express, TypeScript ✅
- **Database**: Cloud SQL (MySQL) with Prisma ORM ✅
- **Authentication**: Firebase Auth with JWT, role-based permissions ✅
- **Multi-Tenancy**: Custom tenant-aware middleware with async local storage ✅
- **AI/ML**: Vertex AI, BigQuery ML
- **Caching**: Redis (Memorystore)
- **Deployment**: Cloud Run
- **Testing**: Jest

## 📋 Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- Firebase project (for authentication)
- Redis (optional for local development)
- Google Cloud Project with APIs enabled:
  - Cloud SQL
  - Firebase Admin SDK
  - Vertex AI
  - BigQuery

## 🔧 Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd AiBook
   npm install
   ```

2. **Environment setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Firebase setup** (see `FIREBASE_SETUP.md` for details):
   ```bash
   # Add Firebase credentials to .env
   FIREBASE_PROJECT_ID="your-project-id"
   FIREBASE_CLIENT_EMAIL="service-account-email"
   FIREBASE_PRIVATE_KEY="service-account-private-key"
   ```

4. **Database setup**:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

## 📚 Development

### Task-by-Task Build Plan

We follow an iterative approach:

- [x] **Task 1**: Project Setup ✅
- [x] **Task 2**: Integrate ALE - Adapt accounting logic to Prisma ✅
- [x] **Task 3**: Multi-Tenancy - Enhanced tenant isolation and management ✅
- [x] **Task 4**: Authentication - Firebase Auth with user management ✅
- [x] **Task 5**: Core APIs - Build REST endpoints ✅
- [x] **Task 6**: AI Layer - Add Vertex AI categorization ✅
- [x] **Task 7**: MCP Integration - Implement agent-tool calls ✅
- [x] **Task 8**: Cash Flow Features - Predictive forecasting ✅
- [x] **Task 9**: OpenAI Integration - Enhanced natural language processing ✅
- [x] **Task 10**: Modern AI-Powered UI - React/Next.js frontend ✅
- [x] **Task 11**: Testing - Jest unit and integration tests ✅
- [x] **Task 12**: Deployment - Dockerize and deploy ✅

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm test` - Run tests
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🏗 Architecture

### Core Concepts

- **Tenants**: Isolated environments for different organizations
- **Books**: Accounting ledgers containing accounts and entries
- **Accounts**: Chart of accounts with hierarchical structure
- **Entries**: Individual accounting transactions (debits/credits)
- **Journal Entries**: Grouped entries that must balance
- **Users**: Firebase-authenticated users with role-based permissions

### Enhanced Multi-Tenancy

The system uses advanced tenant isolation with:

#### **Tenant Identification Methods**
1. **JWT Claims**: Extract tenant ID from Firebase JWT tokens
2. **Custom Headers**: `x-tenant-id` header for API calls
3. **Subdomain Routing**: `tenant.aibook.com` format
4. **Query Parameters**: `?tenantId=xxx` (development only)
5. **Default Fallback**: Development mode default tenant

#### **Automatic Tenant Filtering**
- **Prisma Middleware**: Automatically adds `tenantId` filters to all queries
- **Async Local Storage**: Thread-safe tenant context throughout request lifecycle
- **Create Operations**: Auto-inject tenant ID on data creation
- **Update/Delete**: Scope operations to current tenant only

#### **Tenant Management**
- **Tenant Registration**: Create new tenants with default chart of accounts
- **Settings Management**: Per-tenant currency, fiscal year, timezone
- **Statistics**: Comprehensive tenant metrics and activity tracking
- **Permission System**: Role-based access (SUPER_ADMIN, ADMIN, USER, VIEWER)

### Firebase Authentication

Complete authentication system with:

#### **Authentication Features**
- **User Registration**: Create Firebase users with database sync
- **JWT Token Validation**: Secure API authentication
- **Custom Claims**: Automatic tenant and role assignment
- **Role-Based Access**: SUPER_ADMIN, ADMIN, USER, VIEWER roles
- **Permission System**: Granular permission controls
- **Development Mode**: Mock authentication for testing

#### **Authentication Flow**
1. Users register/login through Firebase
2. Backend syncs Firebase users with database
3. Custom claims set for tenant and role information
4. API requests validated using Firebase ID tokens
5. Automatic tenant context and permission enforcement

### Double-Entry Accounting

Following ALE principles:
- Every transaction must balance (debits = credits)
- Multi-currency support with exchange rates
- Audit trail for all financial movements
- Account hierarchy (Assets:Cash, Expenses:Office, etc.)

## 🔐 Security

- **Tenant Isolation**: Complete data separation between tenants
- **Automatic Filtering**: Prisma middleware prevents cross-tenant data access
- **Firebase Authentication**: Secure JWT token validation
- **Role-Based Access Control**: Granular permission system
- **Custom Claims**: Tenant and role information in JWT tokens
- **Input Validation**: Comprehensive request validation and sanitization

## 🤖 AI Features

### Transaction Categorization
```typescript
// AI categorizes transactions automatically
const result = await categorizeTransaction({
  description: "AMAZON.COM AMZN.COM/BILL WA",
  amount: 29.99,
  merchant: "Amazon"
});
// Returns: { category: "Office Supplies", confidence: 0.89 }
```

### Cash Flow Forecasting
```typescript
// Predict future cash flows
const forecast = await forecastCashFlow({
  tenantId: "tenant-123",
  months: 6
});
```

### AI-Powered Frontend
- **AI Chat Interface**: Natural language queries for financial insights
- **Smart Transaction Forms**: Automatic categorization and receipt OCR
- **Real-time AI Insights**: Live financial analysis and recommendations
- **Interactive Dashboards**: AI-enhanced data visualization

### Modern UI Components
- **TransactionForm**: AI-powered transaction entry with receipt upload
- **AIChat**: Natural language financial assistant
- **AIDashboard**: Comprehensive AI-enhanced dashboard
- **Responsive Design**: Mobile-first, modern interface

## 📊 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Headers Required
```
x-tenant-id: your-tenant-id
Authorization: Bearer <firebase-jwt-token> (in production)
```

### Core Endpoints

#### Health Check
```bash
GET /health
```

#### Database Status
```bash
GET /api/v1/status
```

#### Chart of Accounts
```bash
GET /api/v1/accounts
```

### Authentication Endpoints

#### User Registration
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "tenantId": "your-tenant-id"
}
```

#### Get User Profile
```bash
GET /api/v1/auth/profile
Authorization: Bearer <firebase-id-token>
```

#### Update Profile
```bash
PUT /api/v1/auth/profile
Content-Type: application/json
Authorization: Bearer <firebase-id-token>

{
  "name": "Updated Name",
  "email": "newemail@example.com"
}
```

#### List Users (Admin Only)
```bash
GET /api/v1/auth/users?page=1&limit=10
Authorization: Bearer <admin-firebase-id-token>
```

#### Update User Role (Admin Only)
```bash
PUT /api/v1/auth/users/{userId}/role
Content-Type: application/json
Authorization: Bearer <admin-firebase-id-token>

{
  "role": "ADMIN"
}
```

#### Generate Test Token (Development Only)
```bash
POST /api/v1/auth/generate-test-token
Content-Type: application/json

{
  "uid": "test-user-123",
  "tenantId": "default",
  "role": "USER"
}
```

### Tenant Management Endpoints

#### Get Current Tenant
```bash
GET /api/v1/tenants/current
```

#### Get Tenant Statistics
```bash
GET /api/v1/tenants/stats
```

#### Update Tenant Settings
```bash
PUT /api/v1/tenants/current
Content-Type: application/json

{
  "name": "Updated Organization Name",
  "settings": {
    "baseCurrency": "EUR",
    "fiscalYearStart": "04-01",
    "timezone": "Europe/London"
  }
}
```

#### Create New Tenant (Super Admin Only)
```bash
POST /api/v1/tenants/create
Content-Type: application/json

{
  "name": "New Organization",
  "domain": "neworg.aibook.com",
  "adminEmail": "admin@neworg.com",
  "adminName": "Admin User",
  "settings": {
    "baseCurrency": "USD",
    "fiscalYearStart": "01-01",
    "timezone": "UTC"
  }
}
```

#### List All Tenants (Super Admin Only)
```bash
GET /api/v1/tenants/list?page=1&limit=10
```

### Accounting Endpoints

#### Create Journal Entry
```bash
POST /api/v1/transactions/journal-entries
Content-Type: application/json

{
  "memo": "Initial capital investment",
  "reference": "INV-001",
  "entries": [
    {
      "accountCode": "1111",
      "amount": 10000,
      "type": "DEBIT"
    },
    {
      "accountCode": "3100", 
      "amount": 10000,
      "type": "CREDIT"
    }
  ]
}
```

#### Get Account Balance
```bash
GET /api/v1/transactions/accounts/{accountCode}/balance
GET /api/v1/transactions/accounts/{accountCode}/balance?asOfDate=2024-01-01
```

#### Get Account Ledger
```bash
GET /api/v1/transactions/accounts/{accountCode}/ledger
GET /api/v1/transactions/accounts/{accountCode}/ledger?startDate=2024-01-01&endDate=2024-12-31
```

#### Get Trial Balance
```bash
GET /api/v1/transactions/trial-balance
```

### Multi-Currency Support

Create entries with exchange rates:
```json
{
  "memo": "Foreign currency transaction",
  "entries": [
    {
      "accountCode": "1111",
      "amount": 1000,
      "currency": "EUR", 
      "exchangeRate": 1.1,
      "type": "DEBIT"
    },
    {
      "accountCode": "3100",
      "amount": 1100,
      "type": "CREDIT" 
    }
  ]
}
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm test -- --coverage

# Run specific test suites
npm test -- --testPathPattern=accounting
npm test -- --testPathPattern=ai
npm test -- --testPathPattern=integration
```

### Test Coverage
- **Unit Tests**: Core business logic and services
- **Integration Tests**: API endpoints and database operations
- **AI Service Tests**: Transaction categorization and NLP
- **Multi-tenancy Tests**: Tenant isolation and data separation

### Test Structure
```
tests/
├── unit/
│   ├── accounting.test.ts    # Accounting service tests
│   └── ai.test.ts           # AI service tests
├── integration/
│   └── api.test.ts          # API integration tests
└── setup.ts                 # Test configuration
```

### Test Firebase Authentication

The system supports both production Firebase and development mode:

#### **Development Mode Testing (Current)**
- ✅ **Mock Authentication**: Works without Firebase credentials
- ✅ **Role-Based Access**: All permission systems functional
- ✅ **User Management**: Database operations work correctly
- ✅ **Token Validation**: Mock token verification
- ✅ **Custom Claims**: Simulated custom claims functionality

#### **Production Firebase Testing**
For production testing with real Firebase:
1. Set up Firebase service account (see `FIREBASE_SETUP.md`)
2. Configure environment variables
3. Test user registration and authentication
4. Verify custom claims and permissions

### Test Multi-Tenancy Features

The system enforces proper tenant isolation:
- ✅ **Automatic Filtering**: All queries automatically scoped to current tenant
- ✅ **Tenant Validation**: Invalid tenant IDs rejected with 404 error
- ✅ **Permission Enforcement**: Role-based access control working
- ✅ **Data Isolation**: Complete separation between tenant data
- ✅ **Context Management**: Thread-safe tenant context with async local storage

### Test Double-Entry Validation

The system enforces proper double-entry accounting:
- ✅ Balanced entries are accepted
- ❌ Unbalanced entries are rejected with error
- ✅ Multi-currency conversions maintain balance
- ✅ Account balances update correctly

## 🚢 Deployment

### Quick Start with Docker Compose
```bash
# Start all services locally
docker-compose up -d

# Run database migrations
docker-compose --profile tools run db-migrate

# Seed initial data
docker-compose --profile tools run db-seed

# Access the application
# Frontend: http://localhost:3001
# API: http://localhost:3000
# Prisma Studio: http://localhost:5555
```

### Production Deployment to Google Cloud Run
```bash
# Set up environment variables
export GOOGLE_CLOUD_PROJECT="your-project-id"
export DATABASE_URL="your-cloud-sql-url"
export REDIS_URL="your-redis-url"
# ... other required env vars

# Run deployment script
./scripts/deploy.sh
```

### Manual Deployment Steps
1. **Build Docker images**
   ```bash
   docker build -t aibook-api .
   docker build -t aibook-frontend ./frontend
   ```

2. **Push to Container Registry**
   ```bash
   docker tag aibook-api gcr.io/PROJECT_ID/aibook-api
   docker push gcr.io/PROJECT_ID/aibook-api
   ```

3. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy aibook-api --image gcr.io/PROJECT_ID/aibook-api
   ```

4. **Configure environment variables and secrets**
5. **Set up Firebase service account**
6. **Run database migrations**

### Environment Variables
Required environment variables for production:
- `DATABASE_URL`: MySQL connection string
- `REDIS_URL`: Redis connection string
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_CLIENT_EMAIL`: Firebase service account email
- `FIREBASE_PRIVATE_KEY`: Firebase private key
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_CLOUD_PROJECT`: Google Cloud project ID

## 📚 Documentation

**Comprehensive documentation is organized in the [`docs/`](docs/) directory:**

- **[Documentation Index](docs/README.md)** - Complete documentation guide
- **[Setup & Configuration](docs/setup/)** - Firebase, GCP, Redis, OpenAI setup
- **[Architecture](docs/architecture/)** - System design and streaming infrastructure  
- **[Guides & References](docs/guides/)** - API docs, demos, and implementation examples

**Development:**
- **[Quick Start Guide](QUICK_START.md)** - Get running in 2 minutes
- **[Configuration Saved](CONFIGURATION_SAVED.md)** - Pre-configured environment details

## 📈 Monitoring

- Cloud Logging for application logs
- Cloud Monitoring for metrics
- Error Reporting for error tracking
- Cloud Trace for performance monitoring
- Firebase Analytics for user behavior

## 🤝 Contributing

1. Follow the task-by-task development plan
2. Write tests for new features
3. Ensure multi-tenancy isolation is maintained
4. Ensure Firebase authentication is working
5. Ensure double-entry accounting rules are maintained
6. Document AI model integration

## 📄 License

MIT License - see LICENSE file for details

## 🙋‍♂️ Support

For support and questions:
- Create an issue in the repository
- Check the documentation in `/docs`
- Review the Firebase setup guide in `FIREBASE_SETUP.md`
- Review the task-by-task development guide 