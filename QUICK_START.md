# 🚀 Cashflow Copilot - Quick Start Guide

This guide will help you get Cashflow Copilot running quickly with all the necessary configurations.

## ⚡ Super Quick Start

### Option 1: Start Everything at Once
```bash
# Run this single command to set up and start everything
npm run dev:all
```

### Option 2: Start Services Separately
```bash
# 1. Set up environment and database
npm run dev:setup

# 2. Start backend (in one terminal)
npm run dev:backend

# 3. Start frontend (in another terminal)  
npm run dev:frontend
```

### Option 3: Use Shell Scripts Directly
```bash
# If you prefer shell scripts
./scripts/development/start-all.sh          # Start everything
./scripts/development/setup-environment.sh  # Setup only
./scripts/development/start-backend.sh      # Backend only
./scripts/development/start-frontend.sh     # Frontend only
```

## 🌐 Access Your Application

Once both services are running:
- **Frontend**: http://localhost:3001 
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 🔧 What the Scripts Do

### `setup-environment.sh`
- ✅ Configures all environment variables for Cloud SQL
- ✅ Connects to your Cloud SQL database
- ✅ Creates the "default" tenant if it doesn't exist
- ✅ Verifies database connectivity

### `start-backend.sh`
- ✅ Sets up environment variables
- ✅ Verifies default tenant exists
- ✅ Starts the backend API server on port 3000

### `start-frontend.sh`
- ✅ Starts the Next.js frontend on port 3001
- ✅ Configures API proxy to backend

### `start-all.sh`
- ✅ Runs all of the above in the correct order

## 🗄️ Database Configuration

The application is configured to use your Cloud SQL database:
- **Host**: 34.123.50.107
- **Database**: aiAccount
- **Default Tenant**: "default" (auto-created)

## 🚨 Troubleshooting

### If you get authentication errors:
```bash
# Kill all processes and restart fresh
pkill -f "npm run dev"
./scripts/start-all.sh
```

### If the default tenant is missing:
```bash
# Run the setup script to recreate it
./scripts/setup-environment.sh
```

### If ports are in use:
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :3001

# Kill processes if needed
pkill -f "npm run dev"
```

## 🎯 Development Workflow

1. **First time setup**: Run `./scripts/start-all.sh`
2. **Daily development**: 
   - Backend: `./scripts/start-backend.sh`
   - Frontend: `./scripts/start-frontend.sh`
3. **If issues occur**: Re-run `./scripts/setup-environment.sh`

## 🔒 Environment Variables

All environment variables are configured in the startup scripts:

```bash
NODE_ENV=development
DATABASE_URL="mysql://gtadmin:gtapp456$%^@34.123.50.107:3306/aiAccount?sslmode=disable"
DEFAULT_TENANT_ID=default
REDIS_URL="redis://localhost:6379"
KAFKAJS_NO_PARTITIONER_WARNING=1
```

## 🎉 That's It!

Your Cashflow Copilot application should now be running smoothly with:
- ✅ Cloud SQL database connection
- ✅ Default tenant configured
- ✅ Authentication working
- ✅ Both frontend and backend running

Happy coding! 🚀
