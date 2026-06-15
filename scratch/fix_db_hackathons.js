import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Signing up/logging in temporary admin user...");
  const email = `admin-${Math.random().toString().substring(2, 8)}@example.com`;
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password: "Password123!"
  });
  if (authErr) {
    console.error("Auth error:", authErr.message);
    return;
  }
  const userId = authData.user.id;
  await new Promise(r => setTimeout(r, 1500));

  console.log("Fetching all hackathons...");
  const { data: hacks, error: fetchErr } = await supabase.from("hackathons").select("*");
  if (fetchErr) {
    console.error("Fetch error:", fetchErr.message);
    return;
  }

  console.log(`Processing ${hacks.length} hackathons...`);
  for (const h of hacks) {
    let originalDescription = h.description || "";
    let cleanDesc = originalDescription;
    let meta = {};

    const parts = originalDescription.split("\n\n---METADATA---\n");
    if (parts.length > 1) {
      cleanDesc = parts[0];
      try {
        meta = JSON.parse(parts[1]);
      } catch (e) {
        console.error(`Error parsing existing metadata for ${h.title}:`, e);
      }
    }

    // Determine category based on title
    if (!meta.category) {
      const titleLower = h.title.toLowerCase();
      if (titleLower.includes("ai") || titleLower.includes("ml") || titleLower.includes("intelligence")) {
        meta.category = "AI & ML";
      } else if (titleLower.includes("sustain") || titleLower.includes("green") || titleLower.includes("climate")) {
        meta.category = "Sustainability";
      } else if (titleLower.includes("web") || titleLower.includes("front") || titleLower.includes("back")) {
        meta.category = "Web Dev";
      } else if (titleLower.includes("health") || titleLower.includes("med")) {
        meta.category = "HealthTech";
      } else if (titleLower.includes("fin") || titleLower.includes("pay")) {
        meta.category = "FinTech";
      } else {
        meta.category = "General";
      }
    }

    // Determine team sizes
    if (!meta.teamSize) {
      if (h.title.toLowerCase().includes("sustain")) {
        meta.teamSize = "1-3";
      } else if (h.title.toLowerCase().includes("pranavi") || h.title.toLowerCase().includes("test")) {
        meta.teamSize = "2-4";
      } else {
        meta.teamSize = "1-4";
      }
    }

    // Parse/Set min and max team size
    if (meta.teamSize) {
      const rangeParts = String(meta.teamSize).split("-");
      if (rangeParts.length > 0) {
        const minVal = parseInt(rangeParts[0], 10);
        meta.team_size_min = isNaN(minVal) ? 1 : minVal;
      }
      if (rangeParts.length > 1) {
        const maxVal = parseInt(rangeParts[1], 10);
        meta.team_size_max = isNaN(maxVal) ? 4 : maxVal;
      } else {
        meta.team_size_max = meta.team_size_min;
      }
    }

    if (!meta.owner_id) {
      meta.owner_id = userId;
    }

    if (!meta.tags || meta.tags.length === 0) {
      meta.tags = [meta.category || "General"];
    }

    if (!meta.requirements) {
      meta.requirements = [
        { id: "fullName", label: "Full Name", type: "text", required: true },
        { id: "email", label: "Email Address", type: "email", required: true },
        { id: "college", label: "College / University", type: "text", required: true }
      ];
    }

    const updatedDescription = `${cleanDesc.trim()}\n\n---METADATA---\n${JSON.stringify(meta)}`;

    const { error: updateErr } = await supabase
      .from("hackathons")
      .update({ description: updatedDescription })
      .eq("id", h.id);

    if (updateErr) {
      console.error(`Failed to update "${h.title}":`, updateErr.message);
    } else {
      console.log(`Updated "${h.title}" -> Category: ${meta.category}, Team Size: ${meta.teamSize} (min: ${meta.team_size_min}, max: ${meta.team_size_max})`);
    }
  }
}

run().catch(console.error);
