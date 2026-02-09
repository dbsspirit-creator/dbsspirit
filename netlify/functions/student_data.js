import { neon } from "@netlify/neon";

export default async (req, context) => {
  const sql = neon(process.env.DATABASE_URL);

  // Ensure table exists (Lazy migration for prototype)
  try {
    await sql`CREATE TABLE IF NOT EXISTS student_data (
      student_id VARCHAR(255) PRIMARY KEY,
      game_data TEXT
    )`;
    // Add columns if they don't exist
    await sql`ALTER TABLE student_data ADD COLUMN IF NOT EXISTS name_cn VARCHAR(255)`;
    await sql`ALTER TABLE student_data ADD COLUMN IF NOT EXISTS name_en VARCHAR(255)`;
    await sql`ALTER TABLE student_data ADD COLUMN IF NOT EXISTS class VARCHAR(50)`;
    await sql`ALTER TABLE student_data ADD COLUMN IF NOT EXISTS class_no VARCHAR(50)`;
    await sql`ALTER TABLE student_data ADD COLUMN IF NOT EXISTS password VARCHAR(255)`;
  } catch (err) {
    console.error("Error checking/creating table:", err);
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const student_id = url.searchParams.get("student_id");
    const password = url.searchParams.get("password");

    if (!student_id) {
      return new Response("Missing student_id", { status: 400 });
    }

    try {
      const rows = await sql`SELECT * FROM student_data WHERE student_id = ${student_id}`;
      if (rows.length > 0) {
        const user = rows[0];

        // Password check
        if (user.password && user.password !== password) {
            return new Response("Password not correct", { status: 401 });
        }

        // Remove sensitive data before returning
        delete user.password;

        return new Response(JSON.stringify(user), {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ game_data: null }), {
            headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      console.error("Database error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  } else if (req.method === "POST") {
    try {
      const body = await req.json();
      const { student_id, game_data } = body;

      if (!student_id || !game_data) {
        return new Response("Missing student_id or game_data", { status: 400 });
      }

      // Only update existing records, do not create new ones
      await sql`
        UPDATE student_data
        SET game_data = ${game_data}
        WHERE student_id = ${student_id}
      `;

      return new Response("Saved", { status: 200 });
    } catch (error) {
      console.error("Database error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
};
