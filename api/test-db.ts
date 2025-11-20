import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check if sql is available
    if (!sql) {
      return res.status(500).json({
        success: false,
        error: "sql is not available - check @vercel/postgres import",
        hasPostgresUrl: !!process.env.POSTGRES_URL
      });
    }

    // Test 1: Basic connection
    try {
      const test1 = await sql`SELECT 1 as test`;
      console.log('✅ Basic connection works:', test1.rows);
      
      // Test 2: Check if events table exists
      try {
        const eventsCount = await sql`SELECT COUNT(*) as count FROM events`;
        console.log('✅ Events table exists, count:', eventsCount.rows[0]);
        
        // Test 3: Get a few events
        const sampleEvents = await sql`SELECT * FROM events LIMIT 3`;
        console.log('✅ Sample events:', sampleEvents.rows.length);
        
        return res.status(200).json({
          success: true,
          connection: "working",
          eventsTableExists: true,
          eventCount: eventsCount.rows[0]?.count || 0,
          sampleEvents: sampleEvents.rows,
          columns: sampleEvents.rows.length > 0 ? Object.keys(sampleEvents.rows[0]) : []
        });
      } catch (tableError: any) {
        console.error('❌ Events table error:', tableError);
        return res.status(200).json({
          success: true,
          connection: "working",
          eventsTableExists: false,
          error: tableError?.message,
          code: tableError?.code,
          details: tableError?.stack
        });
      }
    } catch (dbError: any) {
      console.error('❌ Database connection error:', dbError);
      return res.status(500).json({
        success: false,
        error: dbError?.message || "Database connection failed",
        code: dbError?.code,
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        postgresUrlLength: process.env.POSTGRES_URL?.length || 0,
        details: process.env.NODE_ENV === 'development' ? dbError?.stack : undefined
      });
    }
  } catch (error: any) {
    console.error('❌ Test endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Unknown error",
      code: error?.code,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}

