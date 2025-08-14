# 📚 Cashflow Copilot - Documentation Index

This directory contains all documentation for the Cashflow Copilot application, organized for easy navigation.

## 🚀 Quick Start
- **[Quick Start Guide](../QUICK_START.md)** - Get up and running in minutes
- **[Configuration Guide](../CONFIGURATION_SAVED.md)** - Understand saved configurations

## 📁 Documentation Structure

### 🔧 Setup & Configuration (`setup/`)
- **[Firebase Setup](setup/FIREBASE_SETUP.md)** - Firebase authentication configuration
- **[Google Cloud Setup](setup/GOOGLE_CLOUD_SETUP.md)** - GCP services configuration
- **[GCP Memorystore Setup](setup/GCP_MEMORYSTORE_SETUP.md)** - Redis cache setup
- **[OpenAI Setup](setup/OPENAI_SETUP.md)** - AI services configuration
- **[Redis Setup Guide](setup/REDIS_SETUP_GUIDE.md)** - Local Redis setup

### 🏗️ Architecture (`architecture/`)
- **[AI-First Architecture Plan](architecture/AI_FIRST_ARCHITECTURE_PLAN.md)** - Overall system architecture
- **[Streaming Infrastructure Guide](architecture/STREAMING_INFRASTRUCTURE_GUIDE.md)** - Event streaming setup

### 📖 Guides & References (`guides/`)
- **[Investor Presentation Guide](guides/INVESTOR_PRESENTATION_GUIDE.md)** - Demo and presentation materials
- **[Investor Demo Script](guides/INVESTOR_DEMO_SCRIPT.md)** - Step-by-step demo script
- **[AI Capabilities Demo](guides/AI_CAPABILITIES_DEMO.md)** - AI features demonstration
- **[Implementation Examples](guides/IMPLEMENTATION_EXAMPLES.md)** - Code examples and patterns
- **[COGS API Documentation](guides/COGS_API_DOCUMENTATION.md)** - Cost of Goods Sold API
- **[COGS Implementation Report](guides/COGS_IMPLEMENTATION_REPORT.md)** - Implementation details
- **[ALE Accounting TODO](guides/ALE_ACCOUNTING_TODO.md)** - Accounting features roadmap

## 🛠️ Development

### Scripts Organization
- **`scripts/development/`** - Development and startup scripts
- **`scripts/database/`** - Database migration and seeding scripts
- **`scripts/deployment/`** - Production deployment scripts
- **`scripts/testing/`** - Testing and validation scripts

### Key Commands
```bash
# Development
npm run dev:all        # Start everything
npm run dev:setup      # Setup environment
npm run dev:backend    # Backend only
npm run dev:frontend   # Frontend only

# Database
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations
npm run db:seed        # Seed development data

# Testing
npm run test           # Run tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

## 🌐 Application URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 📞 Support

For questions or issues:
1. Check the [Quick Start Guide](../QUICK_START.md)
2. Review the [Configuration Guide](../CONFIGURATION_SAVED.md)
3. Check the relevant setup documentation
4. Review the architecture documentation for system understanding

## 🔄 Keep Documentation Updated

When adding new features or configurations:
1. Update relevant documentation files
2. Add new files to appropriate subdirectories
3. Update this index file
4. Update the main README.md if needed
