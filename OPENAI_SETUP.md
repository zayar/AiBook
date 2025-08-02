# OpenAI API Configuration

## Overview
This document explains how to configure the OpenAI API key for the AiBook application to enable AI-powered features.

## Configuration Steps

### 1. Add API Key to Environment Variables
Add your OpenAI API key to the `.env` file in the project root:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Environment File Location
- **Backend**: `.env` in the project root
- **Frontend**: Uses the backend API, no direct OpenAI integration needed

### 3. How It Works
The OpenAI API key is loaded automatically when the backend server starts:

1. **Environment Loading**: `dotenv.config()` in `src/index.ts` loads the `.env` file
2. **API Initialization**: The key is used in `src/services/aiService.ts` to initialize the OpenAI client
3. **Status Checking**: The configuration is validated in `src/routes/aiRoutes.ts`

### 4. Verification
After adding the API key and restarting the server, you can verify the configuration:

```bash
# Check health endpoint
curl http://localhost:3000/health

# Check detailed status with AI services
curl http://localhost:3000/api/v1/status
```

Look for `"openai": "connected"` in the AI services section.

### 5. Security
- The `.env` file is included in `.gitignore` to prevent accidental commits
- Never commit API keys to version control
- Use environment variables for production deployments

### 6. AI Features Enabled
With OpenAI configured, the following features are available:

- **Intelligent Categorization**: Automatic transaction categorization
- **OCR Processing**: Receipt and document processing
- **Financial Insights**: AI-powered financial analysis
- **Cash Flow Forecasting**: Predictive financial modeling
- **Anomaly Detection**: Unusual transaction detection
- **Natural Language Queries**: AI-powered search and analysis
- **Smart Reconciliation**: Automated account reconciliation

### 7. Troubleshooting

**Warning: "OpenAI API key not configured"**
- Ensure the API key is added to `.env` file
- Restart the backend server after adding the key
- Verify the key format starts with `sk-`

**Status shows "not_configured"**
- Check that the `.env` file exists in the project root
- Verify there are no typos in the environment variable name
- Ensure the server has been restarted after configuration

### 8. Usage in Code
The OpenAI service is accessible through:

```typescript
// Check if OpenAI is configured
const isConfigured = !!process.env.OPENAI_API_KEY;

// Initialize OpenAI client
import OpenAI from 'openai';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

## Last Updated
August 2, 2025 - Initial configuration completed