/**
 * Environment validation — ensures all required vars are set in production
 */

const REQUIRED_ENV_VARS = [
  'GROQ_API_KEY',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'DATABASE_URL',
] as const;

const OPTIONAL_ENV_VARS = [
  'YOUTUBE_CLIENT_ID',
  'YOUTUBE_CLIENT_SECRET',
  'YOUTUBE_REFRESH_TOKEN',
  'INSTAGRAM_ACCESS_TOKEN',
  'INSTAGRAM_BUSINESS_ACCOUNT_ID',
  'PEXELS_API_KEY',
  'PIXABAY_API_KEY',
  'REDIS_URL',
] as const;

export function validateEnv() {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required vars
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check optional vars (warn only)
  for (const varName of OPTIONAL_ENV_VARS) {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  }

  if (missing.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:');
    missing.forEach((v) => console.error(`   - ${v}`));
    console.error('\nSet these in your .env file or hosting platform.');
    process.exit(1);
  }

  if (warnings.length > 0 && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Optional environment variables not set:');
    warnings.forEach((v) => console.warn(`   - ${v}`));
    console.warn('Some features may be disabled (YouTube/Instagram uploads, backgrounds).\n');
  }

  console.log('✅ Environment validated');
}

// Auto-validate on import in production
if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  validateEnv();
}
