import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

/**
 * @fileOverview Production health check endpoint.
 * Verifies service availability and critical configuration without exposing secrets.
 */

export async function GET() {
  try {
    // 1. Verify Firebase Admin initialization
    const isFirebaseReady = admin.apps.length > 0;

    // 2. Check for presence of mandatory environment variables
    const requiredEnv = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY',
      'GOOGLE_GENAI_API_KEY'
    ];

    const missing = requiredEnv.filter(env => !process.env[env]);

    if (missing.length > 0) {
      return NextResponse.json({
        status: 'unhealthy',
        reason: 'Configuration incomplete',
        missing: missing.map(m => m.substring(0, 3) + '...') // reveal only prefix for debugging
      }, { status: 503 });
    }

    if (!isFirebaseReady) {
      return NextResponse.json({ status: 'unhealthy', reason: 'Firebase Admin not initialized' }, { status: 503 });
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        firebase: 'up',
        ai: 'configured'
      }
    });
  } catch (error) {
    return NextResponse.json({ status: 'unhealthy', error: 'Internal health check failure' }, { status: 500 });
  }
}
