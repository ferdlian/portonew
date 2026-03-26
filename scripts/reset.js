import { createClient } from "@libsql/client";

const client = createClient({
  url: "libsql://porto-ferdlian.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInJpZCI6IjI4NzRmNTUzLWJhMjgtNDUzMy05ZmI3LTRjYTlhYjAzZGYwNyJ9.ZMr2PJHmGSjUZoKc8G_CMR2Krm9g_fZBFz1VJxrFf92PFNqN31ijXRUwGpmMXsu_YrMJBHhsBWjbQPLU-BSFDw"
});

async function run() {
  const tables = [
    "schema_migrations", "site_settings", "nav_items", "hero_highlights", 
    "stats", "services", "projects", "gallery_items", "process_steps", 
    "testimonials", "admin_users", "admin_sessions", "before_after_items", 
    "auth_state", "project_progress_items", "project_timeline_items"
  ];
  
  console.log("Dropping tables...");
  for (const t of tables) {
    try {
      await client.execute(`DROP TABLE IF EXISTS ${t}`);
      console.log(`- Dropped ${t}`);
    } catch (e) {
      console.log(`- Failed dropping ${t}: ${e.message}`);
    }
  }
  console.log("Reset finished.");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
