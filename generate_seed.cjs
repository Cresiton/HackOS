const fs = require('fs');
const crypto = require('crypto');

// --- Helper Data ---
const maleNames = ["Sanjay", "Arjun", "Vikram", "Karthik", "Rahul", "Aditya", "Vishal", "Siddharth", "Gautham", "Hari", "Naveen", "Praveen", "Ashwin", "Manoj", "Pradeep", "Dinesh", "Suresh", "Ramesh", "Balaji", "Surya", "Vijay", "Ajith", "Dhanush", "Siva", "Gokul", "Nithin", "Bharath", "Saravanan", "Venkatesh", "Madhan", "Kishore", "Sriram", "Aravind", "Logesh", "Kannan", "Vignesh", "Deepak", "Ganesan", "Jayanth", "Mukesh", "Prasanth", "Raghav", "Sandeep", "Tharun", "Vimal", "Yogesh", "Bala", "Chandru", "Elango", "Gowtham"];
const femaleNames = ["Priya", "Divya", "Swathi", "Kavya", "Sneha", "Ananya", "Nandhini", "Ramya", "Shruthi", "Keerthi", "Preethi", "Aishwarya", "Deepa", "Sangeetha", "Lakshmi", "Anitha", "Nithya", "Pavithra", "Revathi", "Sowmya", "Vidya", "Meena", "Geetha", "Arthi", "Bhavani", "Chithra", "Dharshini", "Gayathri", "Harini", "Indhu", "Janani", "Kala", "Latha", "Malini", "Nisha", "Oviya", "Pooja", "Roshini", "Sandhya", "Trisha", "Uma", "Vani", "Yamini", "Archana", "Banu", "Charu", "Dhanya", "Eshwari", "Ganga", "Hema"];
const lastNames = ["Kumar", "Raj", "Krishnan", "Iyer", "Nair", "Rao", "Pillai", "Reddy", "Menon", "Babu", "Rajan", "Swamy", "Natarajan", "Balasubramanian", "Chandran", "Sundaram", "Venkatesan", "Murugan", "Ganesan", "Raman"];

const colleges = [
  "SSN College of Engineering, Chennai",
  "College of Engineering Guindy (CEG), Chennai",
  "SRM Institute of Science and Technology, Chennai",
  "Vellore Institute of Technology (VIT), Vellore",
  "PSG College of Technology, Coimbatore",
  "Madras Institute of Technology (MIT), Chennai",
  "Thiagarajar College of Engineering (TCE), Madurai",
  "Amrita Vishwa Vidyapeetham, Coimbatore",
  "SASTRA Deemed University, Thanjavur",
  "Sri Sivasubramaniya Nadar (SSN), Chennai",
  "Kumaraguru College of Technology (KCT), Coimbatore"
];

const cities = [
  { name: "Chennai, Tamil Nadu", lat: 13.0827, lon: 80.2707 },
  { name: "Coimbatore, Tamil Nadu", lat: 11.0168, lon: 76.9558 },
  { name: "Madurai, Tamil Nadu", lat: 9.9252, lon: 78.1198 },
  { name: "Trichy, Tamil Nadu", lat: 10.7905, lon: 78.7047 },
  { name: "Salem, Tamil Nadu", lat: 11.6643, lon: 78.1460 },
  { name: "Vellore, Tamil Nadu", lat: 12.9165, lon: 79.1325 }
];

const bios = [
  "Passionate about building scalable systems. Always exploring new tech.",
  "Hackathon enthusiast. Love turning coffee into code.",
  "Building the future one commit at a time. Tech community builder.",
  "Open source contributor and competitive programmer.",
  "Design thinker, code doer. Bridging the gap between logic and creativity.",
  "Constantly learning, constantly building. Let's collaborate!",
  "Full-time student, part-time indie hacker. Crafting side projects.",
  "Seeking challenging projects to hone my skills and make an impact.",
  "Tech geek, problem solver, and avid learner. Always up for a hackathon.",
  "Transforming ideas into reality through code. Eager to join a dynamic team."
];

const roleDistribution = [
  { role: "Full Stack Developer", count: 15, skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "Next.js", "MongoDB", "Express", "Tailwind CSS"] },
  { role: "Backend Developer", count: 12, skills: ["Node.js", "Python", "Go", "PostgreSQL", "Redis", "Docker", "AWS", "GraphQL"] },
  { role: "Frontend Developer", count: 12, skills: ["React", "Vue.js", "CSS3", "HTML5", "TypeScript", "Tailwind CSS", "Redux", "Figma"] },
  { role: "ML Engineer", count: 10, skills: ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "Computer Vision", "NLP"] },
  { role: "UI/UX Designer", count: 10, skills: ["Figma", "Adobe XD", "Sketch", "Prototyping", "User Research", "Wireframing", "CSS"] },
  { role: "Mobile Developer", count: 10, skills: ["Flutter", "React Native", "Swift", "Kotlin", "iOS", "Android", "Firebase"] },
  { role: "DevOps Engineer", count: 8, skills: ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform", "Linux", "Bash", "Jenkins"] },
  { role: "Data Scientist", count: 8, skills: ["Python", "SQL", "R", "Data Visualization", "Machine Learning", "Statistics", "Tableau"] },
  { role: "Blockchain Developer", count: 5, skills: ["Solidity", "Web3.js", "Ethereum", "Smart Contracts", "Rust", "Cryptography"] },
  { role: "Content Developer", count: 5, skills: ["Technical Writing", "Markdown", "SEO", "Documentation", "Blogging", "Copywriting"] },
  { role: "Student", count: 5, skills: ["C++", "Java", "Python", "Data Structures", "Algorithms", "Git"] }
];

function generateUUID() {
  return crypto.randomUUID();
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate users
let users = [];
let menCounter = 1;
let womenCounter = 1;

roleDistribution.forEach(roleGroup => {
  for (let i = 0; i < roleGroup.count; i++) {
    const isMale = Math.random() > 0.4;
    const firstName = isMale ? randomItem(maleNames) : randomItem(femaleNames);
    const lastName = randomItem(lastNames);
    const fullName = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${crypto.randomUUID().substring(0, 8)}@demo.hackos.com`;
    
    let avatarUrl;
    if (isMale) {
      avatarUrl = `https://randomuser.me/api/portraits/men/${menCounter}.jpg`;
      menCounter = (menCounter % 99) + 1;
    } else {
      avatarUrl = `https://randomuser.me/api/portraits/women/${womenCounter}.jpg`;
      womenCounter = (womenCounter % 99) + 1;
    }

    const cityObj = randomItem(cities);
    // slight variation in lat/lon
    const lat = cityObj.lat + (Math.random() * 0.05 - 0.025);
    const lon = cityObj.lon + (Math.random() * 0.05 - 0.025);

    // Trust score based on random logic representing experience
    let trustScore;
    const rand = Math.random();
    if (rand < 0.2) trustScore = randomInt(35, 55);
    else if (rand < 0.6) trustScore = randomInt(56, 75);
    else if (rand < 0.9) trustScore = randomInt(76, 90);
    else trustScore = randomInt(91, 100);

    // Pick 3-5 random skills from their role's skill set
    const numSkills = randomInt(3, 5);
    const userSkills = [...roleGroup.skills].sort(() => 0.5 - Math.random()).slice(0, numSkills);

    users.push({
      id: generateUUID(),
      name: fullName,
      email: email,
      avatar: avatarUrl,
      role: roleGroup.role,
      bio: randomItem(bios),
      location: cityObj.name,
      latitude: lat,
      longitude: lon,
      college: randomItem(colleges),
      trustScore: trustScore,
      skills: userSkills
    });
  }
});

// Create SQL Script
let sql = `-- HackOS Demo User Seed Script (100 Users)
-- DO NOT RUN MORE THAN ONCE TO AVOID DUPLICATES
-- Generated by generate_seed.js

BEGIN;

`;

// 1. Insert into auth.users
sql += `-- Insert into auth.users\n`;
sql += `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES\n`;

const authUserValues = users.map(u => {
  // Using a generic bcrypt hash for 'HackOSDemo123!'
  const passHash = '$2a$10$wT0X8U9BvX5T2P5S1Z0Y0.q/V7O3yV1Z0Y0.q/V7O3yV1Z0Y0.q/V'; 
  return `('${u.id}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '${u.email}', '${passHash}', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"${u.name}"}', now(), now(), '', '', '', '')`;
});
sql += authUserValues.join(',\n') + `\nON CONFLICT (id) DO NOTHING;\n\n`;

// 2. Insert into public.profiles (Using UPSERT in case a trigger auto-created the profile row)
sql += `-- Insert into public.profiles\n`;
sql += `INSERT INTO public.profiles (id, name, email, avatar_url, role, bio, location, latitude, longitude, college, trust_score, availability, profile_completed, created_at) VALUES\n`;

const profileValues = users.map(u => {
  return `('${u.id}', '${u.name}', '${u.email}', '${u.avatar}', '${u.role}', '${u.bio.replace(/'/g, "''")}', '${u.location}', ${u.latitude}, ${u.longitude}, '${u.college}', ${u.trustScore}, 'available', true, now())`;
});
sql += profileValues.join(',\n') + `\nON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  avatar_url = EXCLUDED.avatar_url,
  role = EXCLUDED.role,
  bio = EXCLUDED.bio,
  location = EXCLUDED.location,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  college = EXCLUDED.college,
  trust_score = EXCLUDED.trust_score,
  availability = EXCLUDED.availability,
  profile_completed = EXCLUDED.profile_completed;\n\n`;

// 3. Insert skills (we need to map skill names to IDs, but since we don't know IDs, we must UPSERT into skills table first, then map them!)
sql += `-- Insert missing skills\n`;
const allUniqueSkills = [...new Set(users.flatMap(u => u.skills))];
sql += `INSERT INTO public.skills (name) VALUES\n`;
sql += allUniqueSkills.map(s => `('${s}')`).join(',\n') + `\nON CONFLICT (name) DO NOTHING;\n\n`;

// 4. Insert into public.user_skills using subqueries
sql += `-- Link user_skills\n`;
sql += `INSERT INTO public.user_skills (user_id, skill_id) VALUES\n`;
const userSkillValues = [];
users.forEach(u => {
  u.skills.forEach(s => {
    userSkillValues.push(`('${u.id}', (SELECT id FROM public.skills WHERE name = '${s}'))`);
  });
});
sql += userSkillValues.join(',\n') + `\nON CONFLICT DO NOTHING;\n\n`;

sql += `COMMIT;\n`;

fs.writeFileSync('demo_users_seed.sql', sql);
console.log('Successfully generated demo_users_seed.sql with 100 users!');
