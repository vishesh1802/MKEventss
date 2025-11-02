import 'dotenv/config';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { sql } from '@vercel/postgres';
import { createTables } from '../lib/db.js';

type CsvEventRow = {
  event_id: string;
  event_name: string;
  genre: string;
  venue_name: string;
  date: string;
  latitude: string;
  longitude: string;
  description: string;
  organizer: string;
  ticket_price: string;
};

type CsvUserHistoryRow = {
  user_id: string;
  event_id: string;
  visit_date: string;
};

async function main() {
  await createTables();

  // Load events
  const eventsCsv = fs.readFileSync('./scripts/Event_data.csv', 'utf-8');
  const eventsRecords = parse<CsvEventRow>(eventsCsv, { columns: true, skip_empty_lines: true });

  for (const row of eventsRecords) {
    try {
      await sql`
        INSERT INTO events (event_id, event_name, genre, venue_name, date, latitude, longitude, description, organizer, ticket_price)
        VALUES (${row.event_id}, ${row.event_name}, ${row.genre}, ${row.venue_name}, ${row.date},
                ${parseFloat(row.latitude)}, ${parseFloat(row.longitude)}, ${row.description}, ${row.organizer}, ${row.ticket_price})
        ON CONFLICT (event_id) DO NOTHING;
      `;
    } catch (err) {
      console.error('Error inserting event:', row.event_id, err);
    }
  }
  console.log(`✅ Uploaded ${eventsRecords.length} events!`);

  // Load user history
  const usersCsv = fs.readFileSync('./scripts/user_data.csv', 'utf-8');
  const usersRecords = parse<CsvUserHistoryRow>(usersCsv, { columns: true, skip_empty_lines: true });

  for (const row of usersRecords) {
    try {
      await sql`
        INSERT INTO user_history (user_id, event_id, visit_date, rating)
        VALUES (${row.user_id}, ${row.event_id}, ${row.visit_date}, NULL)
        ON CONFLICT (user_id, event_id) DO NOTHING;
      `;
    } catch (err) {
      console.error('Error inserting user history:', row.user_id, row.event_id, err);
    }
  }
  console.log(`✅ Uploaded ${usersRecords.length} user history records!`);
  
  console.log('✅ Database fully populated!');
  process.exit(0);
}

main().catch(e => console.error(e));
