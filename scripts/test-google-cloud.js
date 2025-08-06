#!/usr/bin/env node

/**
 * 🧪 Google Cloud Setup Test
 * This script tests your Google Cloud configuration for AiBook
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 TESTING GOOGLE CLOUD SETUP FOR AIBOOK');
console.log('==========================================');
console.log('');

// Test results
const tests = [];

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function addTest(name, passed, message) {
    tests.push({ name, passed, message });
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(color, `${icon} ${name}: ${message}`);
}

async function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, error: error.message, stdout, stderr });
            } else {
                resolve({ success: true, stdout, stderr });
            }
        });
    });
}

async function runTests() {
    console.log('🔍 Running Google Cloud Setup Tests...\n');

    // Test 1: Check if gcloud CLI is installed
    console.log('1️⃣ Testing Google Cloud CLI...');
    const gcloudTest = await runCommand('gcloud version');
    addTest(
        'Google Cloud CLI',
        gcloudTest.success,
        gcloudTest.success 
            ? 'Installed and accessible'
            : 'Not installed or not in PATH'
    );

    // Test 2: Check if user is authenticated
    console.log('\n2️⃣ Testing Authentication...');
    const authTest = await runCommand('gcloud auth list --filter=status:ACTIVE --format="value(account)"');
    addTest(
        'Authentication',
        authTest.success && authTest.stdout.trim().length > 0,
        authTest.success && authTest.stdout.trim().length > 0
            ? `Authenticated as: ${authTest.stdout.trim()}`
            : 'Not authenticated - run "gcloud auth login"'
    );

    // Test 3: Check default project
    console.log('\n3️⃣ Testing Project Configuration...');
    const projectTest = await runCommand('gcloud config get-value project');
    addTest(
        'Default Project',
        projectTest.success && projectTest.stdout.trim().length > 0,
        projectTest.success && projectTest.stdout.trim().length > 0
            ? `Project: ${projectTest.stdout.trim()}`
            : 'No default project set - run "gcloud config set project PROJECT_ID"'
    );

    // Test 4: Check required APIs (if project is set)
    if (projectTest.success && projectTest.stdout.trim().length > 0) {
        console.log('\n4️⃣ Testing Required APIs...');
        const requiredAPIs = [
            'aiplatform.googleapis.com',
            'bigquery.googleapis.com',
            'storage.googleapis.com'
        ];

        for (const api of requiredAPIs) {
            const apiTest = await runCommand(`gcloud services list --enabled --filter="name:${api}" --format="value(name)"`);
            addTest(
                `API: ${api}`,
                apiTest.success && apiTest.stdout.includes(api),
                apiTest.success && apiTest.stdout.includes(api)
                    ? 'Enabled'
                    : `Not enabled - run "gcloud services enable ${api}"`
            );
        }
    }

    // Test 5: Check for service account credentials file
    console.log('\n5️⃣ Testing Service Account Credentials...');
    const credentialsPath = path.join(process.cwd(), 'credentials', 'aibook-service-account-key.json');
    const credentialsExist = fs.existsSync(credentialsPath);
    addTest(
        'Service Account Key',
        credentialsExist,
        credentialsExist
            ? `Found: ${credentialsPath}`
            : `Not found: ${credentialsPath} - create service account key`
    );

    // Test 6: Check environment variables
    console.log('\n6️⃣ Testing Environment Configuration...');
    const requiredEnvVars = [
        'GOOGLE_CLOUD_PROJECT_ID',
        'GOOGLE_CLOUD_LOCATION',
        'BIGQUERY_DATASET_ID'
    ];

    // Check .env file
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        for (const envVar of requiredEnvVars) {
            const hasVar = envContent.includes(envVar);
            addTest(
                `ENV: ${envVar}`,
                hasVar,
                hasVar
                    ? 'Set in .env file'
                    : `Missing from .env file`
            );
        }
    } else {
        addTest(
            'Environment File',
            false,
            '.env file not found - create with Google Cloud configuration'
        );
    }

    // Test 7: Test BigQuery access (if authenticated and project set)
    if (authTest.success && projectTest.success) {
        console.log('\n7️⃣ Testing BigQuery Access...');
        const bqTest = await runCommand('bq ls');
        addTest(
            'BigQuery Access',
            bqTest.success,
            bqTest.success
                ? 'BigQuery accessible'
                : 'BigQuery access failed - check permissions and billing'
        );
    }

    // Test 8: Test Vertex AI access (if authenticated and project set)
    if (authTest.success && projectTest.success) {
        console.log('\n8️⃣ Testing Vertex AI Access...');
        const vertexTest = await runCommand('gcloud ai models list --region=us-central1 --limit=1');
        addTest(
            'Vertex AI Access',
            vertexTest.success,
            vertexTest.success
                ? 'Vertex AI accessible'
                : 'Vertex AI access failed - check API enablement and permissions'
        );
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));

    const passed = tests.filter(t => t.passed).length;
    const total = tests.length;
    const percentage = Math.round((passed / total) * 100);

    if (percentage >= 80) {
        log('green', `🎉 ${passed}/${total} tests passed (${percentage}%) - Setup looks good!`);
    } else if (percentage >= 60) {
        log('yellow', `⚠️  ${passed}/${total} tests passed (${percentage}%) - Some issues to fix`);
    } else {
        log('red', `❌ ${passed}/${total} tests passed (${percentage}%) - Setup needs work`);
    }

    console.log('\n📋 NEXT STEPS:');
    
    if (percentage < 100) {
        console.log('Fix the failed tests above, then:');
    }
    
    console.log('1. Run the automated setup: ./scripts/setup-google-cloud.sh');
    console.log('2. Or follow the manual guide: GOOGLE_CLOUD_SETUP.md');
    console.log('3. Restart your AiBook application');
    console.log('4. Test Vertex AI endpoints');
    
    console.log('\n🔗 Helpful Links:');
    console.log('• Google Cloud Console: https://console.cloud.google.com');
    console.log('• AiBook Setup Guide: ./GOOGLE_CLOUD_SETUP.md');
    console.log('• Automated Setup: ./scripts/setup-google-cloud.sh');

    console.log('\n✨ Happy coding with AI-powered AiBook!');
}

// Run the tests
runTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});