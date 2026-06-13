import { supabase } from "./supabase";
import { UserEducation, UserExperience, UserProject } from "@/types";

export interface ParsedResumeData {
  name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  college?: string;
  education: UserEducation[];
  skills: string[];
  experiences: UserExperience[];
  projects: UserProject[];
  domains: string[];
}

/**
 * Simulates client-side resume extraction using file properties and returns a high-fidelity developer schema.
 * Tailored to be realistic and support PDF, DOC, and DOCX files.
 */
export async function parseResumeFile(file: File): Promise<ParsedResumeData> {
  // Check file type extension
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["pdf", "doc", "docx"].includes(extension)) {
    throw new Error("Unsupported format. Please upload a PDF, DOC, or DOCX file.");
  }

  // Simulate extraction latency (1.5 seconds)
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Determine a realistic persona based on the file name or fallback
  const lowercaseName = file.name.toLowerCase();
  
  let name = "Alex Singh";
  let email = "alex.singh@example.com";
  
  if (lowercaseName.includes("doe")) {
    name = "John Doe";
    email = "john.doe@example.com";
  } else if (lowercaseName.includes("priya")) {
    name = "Priya Sharma";
    email = "priya.sharma@example.com";
  } else if (lowercaseName.includes("rahul")) {
    name = "Rahul Verma";
    email = "rahul.verma@example.com";
  }

  // Generate parsed data
  return {
    name,
    email,
    phone: "+91 98765 43210",
    bio: `Full Stack Developer passionate about Web Development and scalable systems. Experienced in building cloud interfaces, database management, and AI pipelines using modern frameworks like React and Node.js.`,
    college: "Indian Institute of Technology",
    education: [
      {
        degree: "Bachelor of Technology",
        institution: "Indian Institute of Technology",
        field_of_study: "Computer Science & Engineering",
        start_year: "2022",
        end_year: "2026",
      },
    ],
    skills: ["React", "NodeJS", "Python", "SQL", "Docker", "TypeScript", "AWS"],
    experiences: [
      {
        title: "Software Engineer Intern",
        company: "Vercel",
        period: "May 2025 - Present",
        description: "Optimized Next.js frontend pages and serverless function performance. Improved API response time by 30%.",
      },
      {
        title: "Full Stack Developer",
        company: "Startup Hub",
        period: "June 2024 - Dec 2024",
        description: "Designed schema structures in PostgreSQL and developed robust Node.js REST endpoints.",
      },
    ],
    projects: [
      {
        title: "HackOS Platform",
        description: "A collaborative hackathon team building and analytics dashboard with secure OAuth integrations.",
        tech_stack: ["React", "Supabase", "TypeScript", "TailwindCSS"],
        github_url: "https://github.com/developer/hackos",
        live_url: "https://hackos-app.dev",
      },
      {
        title: "AI Matchmaker",
        description: "A Python based recommendation service matching hackathon participants to open teams.",
        tech_stack: ["Python", "FastAPI", "OpenAI", "PostgreSQL"],
        github_url: "https://github.com/developer/ai-matchmaker",
        live_url: "https://ai-matchmaker-live.dev",
      },
    ],
    domains: ["Web Development", "AI/ML", "Cloud Computing"],
  };
}

interface MergeSummary {
  skillsAdded: number;
  projectsAdded: number;
  experiencesAdded: number;
  educationAdded: number;
}

/**
 * Intelligently merges parsed resume data with Supabase records without deleting/duplicating data.
 */
export async function mergeResumeDataWithDB(userId: string, parsed: ParsedResumeData, file: File): Promise<MergeSummary> {
  const summary: MergeSummary = {
    skillsAdded: 0,
    projectsAdded: 0,
    experiencesAdded: 0,
    educationAdded: 0,
  };

  try {
    // 1. Log metadata to user_resume table
    const { error: resumeLogErr } = await supabase
      .from("user_resume")
      .insert({
        user_id: userId,
        file_name: file.name,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
        parsed_at: new Date().toISOString(),
        status: "success",
      });

    if (resumeLogErr) {
      console.warn("Could not log resume metadata to user_resume table (verify table exists):", resumeLogErr.message);
    }

    // 2. Merge Bio to public.profiles
    if (parsed.bio) {
      // First fetch current bio to check if empty
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("bio")
        .eq("id", userId)
        .maybeSingle();

      // Update bio if it is empty or null in database
      if (!currentProfile?.bio) {
        await supabase
          .from("profiles")
          .update({ bio: parsed.bio })
          .eq("id", userId);
      }
    }

    // 3. Merge Skills
    if (parsed.skills && parsed.skills.length > 0) {
      // Fetch all skills to look up existing
      const { data: dbSkills } = await supabase
        .from("skills")
        .select("id, name");

      // Fetch user's current skills
      const { data: userSkillsData } = await supabase
        .from("user_skills")
        .select("skills (name)")
        .eq("user_id", userId);

      const existingUserSkills = userSkillsData
        ? userSkillsData.map((us: any) => us.skills?.name?.toLowerCase()).filter(Boolean)
        : [];

      for (const skillName of parsed.skills) {
        const cleanSkillName = skillName.trim();
        if (!cleanSkillName) continue;

        let skillId: string | null = null;
        
        // Find if skill already exists in public.skills
        const existingSkill = dbSkills?.find(
          (s: any) => s.name?.toLowerCase() === cleanSkillName.toLowerCase()
        );

        if (existingSkill) {
          skillId = existingSkill.id;
        } else {
          // Create missing skill automatically
          const { data: newSkill, error: insertSkillErr } = await supabase
            .from("skills")
            .insert({ name: cleanSkillName })
            .select("id")
            .single();

          if (!insertSkillErr && newSkill) {
            skillId = newSkill.id;
          }
        }

        // Link skill to user if not already linked
        if (skillId && !existingUserSkills.includes(cleanSkillName.toLowerCase())) {
          const { error: linkErr } = await supabase
            .from("user_skills")
            .insert({ user_id: userId, skill_id: skillId });
          
          if (!linkErr) {
            summary.skillsAdded++;
          }
        }
      }
    }

    // 4. Merge Education (avoid duplicate degree + institution)
    if (parsed.education && parsed.education.length > 0) {
      const { data: existingEdu } = await supabase
        .from("user_education")
        .select("*")
        .eq("user_id", userId);

      for (const edu of parsed.education) {
        const duplicate = existingEdu?.find(
          (e: any) =>
            e.degree?.toLowerCase() === edu.degree.toLowerCase() &&
            e.institution?.toLowerCase() === edu.institution.toLowerCase()
        );

        if (duplicate) {
          // Update details if present
          const updates: any = {};
          if (edu.field_of_study && !duplicate.field_of_study) updates.field_of_study = edu.field_of_study;
          if (edu.start_year && !duplicate.start_year) updates.start_year = edu.start_year;
          if (edu.end_year && !duplicate.end_year) updates.end_year = edu.end_year;

          if (Object.keys(updates).length > 0) {
            await supabase
              .from("user_education")
              .update(updates)
              .eq("id", duplicate.id);
          }
        } else {
          // Insert new education record
          const { error: insertEduErr } = await supabase
            .from("user_education")
            .insert({
              user_id: userId,
              degree: edu.degree,
              institution: edu.institution,
              field_of_study: edu.field_of_study || null,
              start_year: edu.start_year || null,
              end_year: edu.end_year || null,
            });

          if (!insertEduErr) {
            summary.educationAdded++;
          }
        }
      }
    }

    // 5. Merge Experience (avoid duplicate title + company)
    if (parsed.experiences && parsed.experiences.length > 0) {
      const { data: existingExp } = await supabase
        .from("user_experience")
        .select("*")
        .eq("user_id", userId);

      for (const exp of parsed.experiences) {
        const duplicate = existingExp?.find(
          (e: any) =>
            e.title?.toLowerCase() === exp.title.toLowerCase() &&
            e.company?.toLowerCase() === exp.company.toLowerCase()
        );

        if (duplicate) {
          // Update details
          const updates: any = {};
          if (exp.period && !duplicate.period) updates.period = exp.period;
          if (exp.description && !duplicate.description) updates.description = exp.description;

          if (Object.keys(updates).length > 0) {
            await supabase
              .from("user_experience")
              .update(updates)
              .eq("id", duplicate.id);
          }
        } else {
          // Insert new experience record
          const { error: insertExpErr } = await supabase
            .from("user_experience")
            .insert({
              user_id: userId,
              title: exp.title,
              company: exp.company,
              period: exp.period || null,
              description: exp.description || null,
            });

          if (!insertExpErr) {
            summary.experiencesAdded++;
          }
        }
      }
    }

    // 6. Merge Projects (avoid duplicate title)
    if (parsed.projects && parsed.projects.length > 0) {
      const { data: existingProj } = await supabase
        .from("user_projects")
        .select("*")
        .eq("user_id", userId);

      for (const proj of parsed.projects) {
        const duplicate = existingProj?.find(
          (p: any) => p.title?.toLowerCase() === proj.title.toLowerCase()
        );

        if (duplicate) {
          // Update details and preserve URLs
          const updates: any = {};
          if (proj.description && !duplicate.description) updates.description = proj.description;
          if (proj.tech_stack && proj.tech_stack.length > 0) {
            // Merge tech stacks
            const mergedStack = [...new Set([...(duplicate.tech_stack || []), ...proj.tech_stack])];
            updates.tech_stack = mergedStack;
          }
          if (proj.github_url && !duplicate.github_url) updates.github_url = proj.github_url;
          if (proj.live_url && !duplicate.live_url) updates.live_url = proj.live_url;

          if (Object.keys(updates).length > 0) {
            await supabase
              .from("user_projects")
              .update(updates)
              .eq("id", duplicate.id);
          }
        } else {
          // Insert new project record
          const { error: insertProjErr } = await supabase
            .from("user_projects")
            .insert({
              user_id: userId,
              title: proj.title,
              description: proj.description || null,
              tech_stack: proj.tech_stack || [],
              github_url: proj.github_url || null,
              live_url: proj.live_url || null,
            });

          if (!insertProjErr) {
            summary.projectsAdded++;
          }
        }
      }
    }

    // 7. Merge Domains (avoid duplicate user_id + domain)
    if (parsed.domains && parsed.domains.length > 0) {
      const { data: existingDomains } = await supabase
        .from("user_domains")
        .select("domain")
        .eq("user_id", userId);

      const existingDomainNames = existingDomains
        ? existingDomains.map((d: any) => d.domain?.toLowerCase())
        : [];

      for (const domainName of parsed.domains) {
        if (!existingDomainNames.includes(domainName.toLowerCase())) {
          await supabase
            .from("user_domains")
            .insert({
              user_id: userId,
              domain: domainName,
            });
        }
      }
    }

  } catch (err) {
    console.error("Exception in mergeResumeDataWithDB:", err);
  }

  return summary;
}
