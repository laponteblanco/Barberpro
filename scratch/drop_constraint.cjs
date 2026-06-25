require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("No DB connection string found in .env");
  process.exit(1);
}

const client = new Client({ connectionString });
client.connect()
  .then(() => client.query('ALTER TABLE public.appointment_services DROP CONSTRAINT IF EXISTS appointment_services_appointment_id_service_id_key;'))
  .then(() => {
    console.log("Constraint dropped successfully.");
    process.exit(0);
  })
  .catch(err => {
    console.error("Error executing query:", err);
    process.exit(1);
  });
