import { config as loadEnv } from "dotenv";
loadEnv();
loadEnv({ path: ".env.local", override: true });
import fs from "fs";
import csv from "csv-parser";
import { sql } from "@vercel/postgres";

async function uploadCSV(filePath: string, table: string) {
  const rows: any[] = [];

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", async () => {
        try {
          console.log(`Uploading ${rows.length} rows to ${table}...`);

          for (const row of rows) {
            if (table === "events") {
              await sql`
                INSERT INTO events (event_id, event_name, genre, venue_name, date, latitude, longitude, description, organizer, ticket_price)
                VALUES (${row.event_id}, ${row.event_name}, ${row.genre}, ${row.venue_name}, ${row.date}, ${parseFloat(row.latitude)}, ${parseFloat(row.longitude)}, ${row.description}, ${row.organizer}, ${row.ticket_price ?? row.price})
                ON CONFLICT (event_id) DO NOTHING;
              `;
            } else if (table === "user_history") {
              await sql`
                INSERT INTO user_history (user_id, event_id, visit_date, rating)
                VALUES (${row.user_id}, ${row.event_id}, ${row.visit_date}, ${row.rating || null})
                ON CONFLICT (user_id, event_id) DO NOTHING;
              `;
            }
          }

          console.log(`✅ Finished uploading ${table}`);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
  });
}

(async () => {
  await uploadCSV("scripts/Event_data.csv", "events");
  await uploadCSV("scripts/user_data.csv", "user_history");
  process.exit(0);
})();
