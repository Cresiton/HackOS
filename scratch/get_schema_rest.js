import axios from "axios";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";

async function test() {
  try {
    console.log("Fetching OpenAPI schema from Supabase REST...");
    const response = await axios.get(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseAnonKey
      }
    });
    console.log("Success! Keys in definitions:", Object.keys(response.data.definitions));
    console.log("Hackathons schema:", JSON.stringify(response.data.definitions.hackathons, null, 2));
  } catch (error) {
    if (error.response) {
      console.error("Error status:", error.response.status);
      console.error("Error headers:", error.response.headers);
      console.error("Error body:", error.response.data);
    } else {
      console.error("Error message:", error.message);
    }
  }
}

test();
