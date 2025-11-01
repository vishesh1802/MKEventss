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

async function main() {
  await createTables();

  const csv = fs.readFileSync('./scripts/Event_data.csv', 'utf-8');
  const records = parse<CsvEventRow>(csv, { columns: true, skip_empty_lines: true });

  for (const row of records) {
    try {
      await sql`
        INSERT INTO events (event_id, event_name, genre, venue_name, date, latitude, longitude, description, organizer, ticket_price)
        VALUES (${row.event_id}, ${row.event_name}, ${row.genre}, ${row.venue_name}, ${row.date},
                ${parseFloat(row.latitude)}, ${parseFloat(row.longitude)}, ${row.description}, ${row.organizer}, ${row.ticket_price})
        ON CONFLICT (event_id) DO NOTHING;
      `;
    } catch (err) {
      console.error('Error inserting:', row.event_id, err);
    }
  }

  
  console.log('✅ Events uploaded successfully!');
  process.exit(0);
}

main().catch(e => console.error(e));
