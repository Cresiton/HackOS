import fs from 'fs';
import crypto from 'crypto';

function uuidv4() {
  return crypto.randomUUID();
}

// Some known user IDs from demo_users_seed.sql to act as organizers
const organizerIds = [
  'f3277d4c-07fa-4c24-9ea5-3c65513f7806',
  'd919d188-8102-4f71-b696-36bbee0eacb9',
  'f9e61646-cf22-4b51-8b52-b4977d85bd86',
  '29dd0e6d-8bc0-4fa1-8b6d-f58f424f7472',
  '2d4da809-ab47-453d-aaf0-8dd8f871b548'
];

const themes = [
  "AI & ML", "Web3", "FinTech", "Healthcare", "EdTech", "Climate Tech",
  "Cybersecurity", "GameDev", "Open Source", "Hardware & IoT"
];

const titles = [
  "Hack India 2026", "Build for Bharat", "AI Innovate Challenge", "FinTech Disrupt",
  "Web3 Unleashed", "TechNova Hackathon", "CodeCrafters Summit", "Global Crypto Hack",
  "EduHack India", "Green Tech Challenge", "CyberGuard 2026", "NextGen GameJam",
  "Open Source Contribute", "Hardware Hustle", "Smart City Hack", "GovTech Innovate",
  "HealthTech Impact", "AI Agent Challenge", "DeFi Connect", "Blockchain Builders",
  "Code for Climate", "CodeBrew Connect", "Data Science Summit", "App Innovation Hack",
  "Cyber Sec Summit", "Metaverse Creators", "Tech for Good", "Innovate X",
  "DevFest India", "Cloud Computing Challenge", "Quantum Hackathon", "DeepTech Disrupt",
  "Robotics Innovate", "Code of Duty", "AgriTech Revolution", "Finclusion Hack",
  "AutoTech Hack", "Mobility Innovate", "Smart India Hackathon 2.0", "Designathon 2026",
  "Ethical Hacking Challenge", "NeuroTech Hack", "SpaceTech Innovation", "AR/VR Challenge",
  "Rural Tech Innovate", "EdTech Impact", "Code For Equity", "Social Impact Hack",
  "Creator Economy Hack", "Web2 to Web3 Challenge"
];

const organizers = [
  "IIT Madras Innovation Cell", "Devsnest", "Microsoft Reactor", "Google Developer Groups",
  "T-Hub Hyderabad", "NASSCOM", "Polygon", "Solana Foundation", "Ethereum India",
  "AWS Startups", "HackerEarth", "Devfolio", "Major League Hacking (MLH)",
  "Techstars India", "Y Combinator (India chapter)", "Sequoia Surge",
  "HackMIT Global", "Stanford d.school (Virtual)", "NITI Aayog", "Digital India"
];

const images = [
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952",
  "https://images.unsplash.com/photo-1515187029135-18ee286d815b",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c",
  "https://images.unsplash.com/photo-1542831371-29b0f74f9713",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71"
];

const descriptions = [
  "Join the ultimate challenge to build the future of technology. Collaborate with the brightest minds and win exciting prizes.",
  "An intensive 48-hour hackathon focused on solving real-world problems using cutting-edge tech.",
  "Bring your ideas to life at our flagship hackathon. Mentorship, networking, and huge prize pools await!",
  "A premier developer event to showcase your coding skills. Build innovative solutions for modern challenges.",
  "Gather your team and build the next big thing. This event is open to students and professionals alike."
];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

let sql = "BEGIN;\n\n";
sql += "INSERT INTO hackathons (id, title, organizer, description, mode, prize, prize_amount, start_date, end_date, registration_deadline, image_url, status, max_participants, participants_count, created_at) VALUES\n";

const hackathons = [];

for (let i = 0; i < 50; i++) {
  const id = uuidv4();
  const title = titles[i] || `Hackathon ${i}`;
  const organizer = getRandom(organizers);
  const theme = getRandom(themes);
  const descBase = getRandom(descriptions);
  
  const tags = [theme, getRandom(["Beginner Friendly", "Intermediate", "Advanced"]), "React", "Node.js"].slice(0, 3);
  const location = getRandom(["Online", "Bangalore, India", "Hyderabad, India", "Mumbai, India", "Chennai, India", "Delhi NCR"]);
  const mode = location === "Online" ? "Online" : getRandom(["Offline", "Hybrid"]);
  
  const requirements = [
    { id: "fullName", label: "Full Name", type: "text", required: true },
    { id: "email", label: "Email Address", type: "email", required: true },
    { id: "college", label: "College / University", type: "text", required: true },
    { id: "resume", label: "Resume (PDF) / Photo", type: "file", required: true }
  ];

  const ownerId = getRandom(organizerIds);
  
  const metadata = {
    tags: tags,
    location: location,
    difficulty: "Intermediate",
    teamSize: "2-4",
    owner_id: ownerId,
    requirements: requirements,
    category: theme,
    team_size_min: 2,
    team_size_max: 4,
    custom_fields: []
  };

  const serializedDescription = `${descBase}\n\n---METADATA---\n${JSON.stringify(metadata)}`;
  
  // Timelines
  const today = new Date();
  
  // Make some events open, some upcoming
  const offsetDays = Math.floor(Math.random() * 30) - 5; // -5 to +25
  const startDate = new Date(today.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  const endDate = new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000);
  const regDeadline = new Date(startDate.getTime() - 1 * 24 * 60 * 60 * 1000);
  
  const status = "open";
  
  const prizePool = Math.floor(Math.random() * 50) * 10000 + 10000;
  const prize = `₹${prizePool.toLocaleString()} INR`;
  
  const max_participants = 500;
  const participants_count = Math.floor(Math.random() * 400) + 10;
  const image_url = getRandom(images) + "?w=400&h=200&fit=crop";

  hackathons.push(`(
    '${id}', 
    '${title.replace(/'/g, "''")}', 
    '${organizer.replace(/'/g, "''")}', 
    '${serializedDescription.replace(/'/g, "''")}', 
    '${mode}', 
    '${prize.replace(/'/g, "''")}', 
    ${prizePool}, 
    '${startDate.toISOString()}', 
    '${endDate.toISOString()}', 
    '${regDeadline.toISOString()}', 
    '${image_url}', 
    '${status}', 
    ${max_participants}, 
    ${participants_count}, 
    NOW()
  )`);
}

sql += hackathons.join(",\n") + ";\n\nCOMMIT;\n";

fs.writeFileSync('demo_hackathons_seed.sql', sql);
console.log("demo_hackathons_seed.sql generated successfully with 50 hackathons!");
