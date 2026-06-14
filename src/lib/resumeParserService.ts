import { supabase } from "./supabase";
import { UserEducation, UserExperience, UserProject, UserResume } from "@/types";
import { callGroq } from "./groq";
import { getDocument, GlobalWorkerOptions, version } from "pdfjs-dist";
import * as mammoth from "mammoth";

// Configure pdfjs-dist worker dynamically using unpkg to match the package version
GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

export interface ParsedResumeData {
  bio: string;
  skills: string[];
  education: UserEducation[];
  experiences: UserExperience[];
  projects: UserProject[];
  domains: string[];
  certifications?: string[];
  tech_stack?: string[];
}

/**
 * Extracts raw plain text from PDF, DOCX, or DOC file buffers on the client side.
 */
async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  if (extension === "pdf") {
    const loadingTask = getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      text += strings.join(" ") + "\n";
    }
    return text;
  } else if (extension === "docx") {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } else if (extension === "doc") {
    // Graceful fallback for older .doc binary files using printable characters scanner
    const uint8 = new Uint8Array(arrayBuffer);
    let text = "";
    const len = uint8.length;
    for (let i = 0; i < len; i++) {
      const code = uint8[i];
      if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
        text += String.fromCharCode(code);
      } else {
        text += " ";
      }
    }
    return text.replace(/\s+/g, " ").trim();
  } else {
    throw new Error("Unsupported format. Please upload a PDF, DOC, or DOCX file.");
  }
}

/**
 * Parses resume file contents using Grok/Groq API.
 */
export async function parseResumeFile(file: File): Promise<ParsedResumeData> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["pdf", "doc", "docx"].includes(extension)) {
    throw new Error("Unsupported format. Please upload a PDF, DOC, or DOCX file.");
  }

  // 1. Extract plain text
  const extractedText = await extractTextFromFile(file);

  if (!extractedText || extractedText.trim().length < 20) {
    throw new Error("Could not extract readable text from the resume file.");
  }

  // 2. Format strict prompt returning only JSON
  const systemPrompt = "You are a professional resume parser. You output ONLY valid raw JSON objects matching the schema. Never wrap response in ```json codeblocks, markdown formats, comments, or HTML.";
  
  const userPrompt = `Extract skills, education history, work experience, projects, technical tools, domains of interest, certifications, and a short bio/summary from the resume text below.

Resume Text:
${extractedText.slice(0, 50000)}

Response Schema:
{
  "bio": "A summary or bio under 100 words",
  "skills": ["List of core skill tags"],
  "education": [
    {
      "degree": "Degree name (e.g., Bachelor of Science)",
      "institution": "University/School name",
      "field_of_study": "Field of study/Major",
      "start_year": "Start year (YYYY)",
      "end_year": "End year (YYYY) or Present"
    }
  ],
  "experience": [
    {
      "title": "Role/Job title",
      "company": "Company name",
      "period": "Start year - End year/Present",
      "description": "Short description of accomplishments"
    }
  ],
  "projects": [
    {
      "title": "Project name",
      "description": "Short description",
      "tech_stack": ["Technologies used"],
      "github_url": "Optional link to repo",
      "live_url": "Optional live demo link"
    }
  ],
  "tech_stack": ["Technical stack tags"],
  "domains": ["Domains, e.g. Web Development, AI/ML, Cybersecurity"],
  "certifications": ["Certifications earned"]
}

Strict Rules:
- Return ONLY the raw JSON object.
- Never return null for array fields. Set them to empty arrays [] if missing.
- Never omit any fields.`;

  const responseText = await callGroq([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ]);

  let cleanJsonText = responseText.trim();
  const match = cleanJsonText.match(/\{[\s\S]*\}/);
  if (match) {
    cleanJsonText = match[0];
  }

  try {
    const parsed = JSON.parse(cleanJsonText);
    return {
      bio: parsed.bio || "",
      skills: parsed.skills || [],
      education: parsed.education || [],
      experiences: parsed.experience || parsed.experiences || [],
      projects: parsed.projects || [],
      domains: parsed.domains || parsed.domains_of_interest || [],
      certifications: parsed.certifications || [],
      tech_stack: parsed.tech_stack || []
    };
  } catch (err) {
    console.error("Failed to parse Groq JSON response. Raw output was:", responseText, err);
    throw new Error("The resume details could not be parsed. Please verify the resume format and try again.");
  }
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
  // 0. Verify authentication and get session user ID
  const { data: { user } } = await supabase.auth.getUser();
  console.log("auth uid", user?.id);
  console.log("upload userId", userId);

  if (!user) {
    throw new Error("Resume upload failed: User is not authenticated. Please log in.");
  }

  // Use the verified user ID from auth session to prevent security policy violations
  const activeUserId = user.id;

  const summary: MergeSummary = {
    skillsAdded: 0,
    projectsAdded: 0,
    experiencesAdded: 0,
    educationAdded: 0,
  };

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const storagePath = `${activeUserId}/resume.${ext}`;

  // 1. Delete previous resume file and all extracted data from database if exists
  try {
    await removeResumeData(activeUserId);
  } catch (err) {
    console.warn("Failed to delete previous resume and its extracted data:", err);
  }

  // 2. Upload the new file to Supabase Storage resumes bucket
  const { error: uploadErr } = await supabase.storage
    .from("resumes")
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type || undefined
    });

  if (uploadErr) {
    throw new Error(`Failed to upload resume: ${uploadErr.message}`);
  }

  // 3. Get the public URL of the uploaded resume
  const { data: urlData } = supabase.storage
    .from("resumes")
    .getPublicUrl(storagePath);

  const fileUrl = urlData.publicUrl;

  // 4. Save metadata in user_resume table (this will trigger RLS policy check)
  const resumePayload = {
    user_id: activeUserId,
    file_name: file.name,
    file_url: fileUrl,
    file_type: file.type || ext || "application/octet-stream",
    uploaded_at: new Date().toISOString(),
  };
  console.log("auth uid", activeUserId);
  console.log("insert payload", resumePayload);

  const { error: resumeLogErr } = await supabase
    .from("user_resume")
    .upsert(resumePayload);

  if (resumeLogErr) {
    throw new Error(`Failed to write resume metadata to database: ${resumeLogErr.message}`);
  }

  // 5. Merge Bio to public.profiles if parsed bio is not empty/null
  if (parsed.bio && parsed.bio.trim()) {
    const { error: bioErr } = await supabase
      .from("profiles")
      .update({ bio: parsed.bio.trim() })
      .eq("id", activeUserId);

    if (bioErr) {
      console.error("Failed to update profile bio:", bioErr.message);
    }
  }

  // 6. Merge Skills (Skills + Tech stack) case-insensitively without duplicate insertion
  const rawSkills = [...(parsed.skills || []), ...(parsed.tech_stack || [])];
  const cleanSkills = [...new Set(rawSkills.map(s => s?.trim()).filter(s => !!s))];

  if (cleanSkills.length > 0) {
    const { data: dbSkills } = await supabase
      .from("skills")
      .select("id, name");

    const { data: userSkillsData } = await supabase
      .from("user_skills")
      .select("skills (name)")
      .eq("user_id", activeUserId);

    const existingUserSkills = userSkillsData
      ? userSkillsData.map((us: any) => us.skills?.name?.toLowerCase()).filter(Boolean)
      : [];

    const mutableDbSkills = dbSkills || [];

    for (const skillName of cleanSkills) {
      const cleanSkillName = skillName.trim();
      const lowerSkillName = cleanSkillName.toLowerCase();
      let skillId: string | null = null;

      const existingSkill = mutableDbSkills.find(
        (s: any) => s.name?.toLowerCase() === lowerSkillName
      );

      if (existingSkill) {
        skillId = existingSkill.id;
      } else {
        const { data: newSkill, error: insertSkillErr } = await supabase
          .from("skills")
          .insert({ name: cleanSkillName })
          .select("id")
          .single();

        if (!insertSkillErr && newSkill) {
          skillId = newSkill.id;
          mutableDbSkills.push({ id: skillId, name: cleanSkillName });
        }
      }

      if (skillId && !existingUserSkills.includes(lowerSkillName)) {
        const skillPayload = { user_id: activeUserId, skill_id: skillId };
        console.log("auth uid", activeUserId);
        console.log("insert payload", skillPayload);

        const { error: linkErr } = await supabase
          .from("user_skills")
          .insert(skillPayload);

        if (!linkErr) {
          summary.skillsAdded++;
          existingUserSkills.push(lowerSkillName);
        }
      }
    }
  }

  // 7. Merge Education (avoid duplicate degree + institution)
  if (parsed.education && parsed.education.length > 0) {
    const { data: existingEdu } = await supabase
      .from("user_education")
      .select("*")
      .eq("user_id", activeUserId);

    for (const edu of parsed.education) {
      if (!edu.degree || !edu.institution) continue;

      const duplicate = existingEdu?.find(
        (e: any) =>
          e.degree?.toLowerCase() === edu.degree.toLowerCase() &&
          e.institution?.toLowerCase() === edu.institution.toLowerCase()
      );

      if (duplicate) {
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
        const eduPayload = {
          user_id: activeUserId,
          degree: edu.degree,
          institution: edu.institution,
          field_of_study: edu.field_of_study || null,
          start_year: edu.start_year || null,
          end_year: edu.end_year || null,
        };
        console.log("auth uid", activeUserId);
        console.log("insert payload", eduPayload);

        const { error: insertEduErr } = await supabase
          .from("user_education")
          .insert(eduPayload);

        if (!insertEduErr) {
          summary.educationAdded++;
        }
      }
    }
  }

  // 8. Merge Experience (avoid duplicate title + company)
  if (parsed.experiences && parsed.experiences.length > 0) {
    const { data: existingExp } = await supabase
      .from("user_experience")
      .select("*")
      .eq("user_id", activeUserId);

    for (const exp of parsed.experiences) {
      if (!exp.title || !exp.company) continue;

      const duplicate = existingExp?.find(
        (e: any) =>
          e.title?.toLowerCase() === exp.title.toLowerCase() &&
          e.company?.toLowerCase() === exp.company.toLowerCase()
      );

      if (duplicate) {
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
        const expPayload = {
          user_id: activeUserId,
          title: exp.title,
          company: exp.company,
          period: exp.period || null,
          description: exp.description || null,
        };
        console.log("auth uid", activeUserId);
        console.log("insert payload", expPayload);

        const { error: insertExpErr } = await supabase
          .from("user_experience")
          .insert(expPayload);

        if (!insertExpErr) {
          summary.experiencesAdded++;
        }
      }
    }
  }

  // 9. Merge Projects (avoid duplicate title)
  if (parsed.projects && parsed.projects.length > 0) {
    const { data: existingProj } = await supabase
      .from("user_projects")
      .select("*")
      .eq("user_id", activeUserId);

    for (const proj of parsed.projects) {
      if (!proj.title) continue;

      const duplicate = existingProj?.find(
        (p: any) => p.title?.toLowerCase() === proj.title.toLowerCase()
      );

      if (duplicate) {
        const updates: any = {};
        if (proj.description && !duplicate.description) updates.description = proj.description;
        if (proj.tech_stack && proj.tech_stack.length > 0) {
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
        const projPayload = {
          user_id: activeUserId,
          title: proj.title,
          description: proj.description || null,
          tech_stack: proj.tech_stack || [],
          github_url: proj.github_url || null,
          live_url: proj.live_url || null,
        };
        console.log("auth uid", activeUserId);
        console.log("insert payload", projPayload);

        const { error: insertProjErr } = await supabase
          .from("user_projects")
          .insert(projPayload);

        if (!insertProjErr) {
          summary.projectsAdded++;
        }
      }
    }
  }

  // 10. Merge Domains (avoid duplicate user_id + domain)
  const parsedDomains = parsed.domains || [];
  const cleanDomains = [...new Set(parsedDomains.map((d: any) => d?.trim()).filter((d: any) => !!d))];

  if (cleanDomains.length > 0) {
    const { data: existingDomains } = await supabase
      .from("user_domains")
      .select("domain")
      .eq("user_id", activeUserId);

    const existingDomainNames = existingDomains
      ? existingDomains.map((d: any) => d.domain?.toLowerCase())
      : [];

    for (const domainName of cleanDomains) {
      if (!existingDomainNames.includes(domainName.toLowerCase())) {
        const domainPayload = {
          user_id: activeUserId,
          domain: domainName,
        };
        console.log("auth uid", activeUserId);
        console.log("insert payload", domainPayload);

        await supabase
          .from("user_domains")
          .insert(domainPayload);
      }
    }
  }

  return summary;
}

/**
 * Deletes the resume file from storage and the metadata row from the database.
 */
export async function removeResumeData(userId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User is not authenticated. Please log in.");
  }
  const activeUserId = user.id;

  // 1. Fetch file extension first from user_resume table
  const { data: existingResume } = await supabase
    .from("user_resume")
    .select("file_name")
    .eq("user_id", activeUserId)
    .maybeSingle();

  if (existingResume?.file_name) {
    const ext = existingResume?.file_name.split(".").pop()?.toLowerCase() || "";
    const storagePath = `${activeUserId}/resume.${ext}`;
    
    // 2. Delete file from resumes bucket
    const { error: storageErr } = await supabase.storage
      .from("resumes")
      .remove([storagePath]);
    
    if (storageErr) {
      console.warn("Storage deletion failed or file already deleted:", storageErr.message);
    }
  }

  // 3. Delete metadata row
  const { error: dbErr } = await supabase
    .from("user_resume")
    .delete()
    .eq("user_id", activeUserId);

  if (dbErr) {
    throw new Error(`Failed to delete resume metadata: ${dbErr.message}`);
  }

  // 4. Delete extracted data related to the resume
  const { error: skillsErr } = await supabase
    .from("user_skills")
    .delete()
    .eq("user_id", activeUserId);
  if (skillsErr) console.error("Failed to delete user skills:", skillsErr.message);

  const { error: eduErr } = await supabase
    .from("user_education")
    .delete()
    .eq("user_id", activeUserId);
  if (eduErr) console.error("Failed to delete user education:", eduErr.message);

  const { error: expErr } = await supabase
    .from("user_experience")
    .delete()
    .eq("user_id", activeUserId);
  if (expErr) console.error("Failed to delete user experience:", expErr.message);

  const { error: projErr } = await supabase
    .from("user_projects")
    .delete()
    .eq("user_id", activeUserId);
  if (projErr) console.error("Failed to delete user projects:", projErr.message);

  const { error: domainsErr } = await supabase
    .from("user_domains")
    .delete()
    .eq("user_id", activeUserId);
  if (domainsErr) console.error("Failed to delete user domains:", domainsErr.message);
}

/**
 * Handles the complete, sequentially-ordered process of uploading and replacing a user's resume,
 * database metadata, and extracted tables.
 */
export async function processResumeUpload(userId: string, file: File): Promise<MergeSummary> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Resume upload failed: User is not authenticated. Please log in.");
  }
  const activeUserId = user.id;

  const summary: MergeSummary = {
    skillsAdded: 0,
    projectsAdded: 0,
    experiencesAdded: 0,
    educationAdded: 0,
  };

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const storagePath = `${activeUserId}/resume.${ext}`;

  // 1. Check if a resume already exists.
  const { data: existingResume } = await supabase
    .from("user_resume")
    .select("file_name")
    .eq("user_id", activeUserId)
    .maybeSingle();

  // 2. Delete the old file from the resumes bucket.
  if (existingResume?.file_name) {
    const oldExt = existingResume.file_name.split(".").pop()?.toLowerCase() || "";
    const oldPath = `${activeUserId}/resume.${oldExt}`;
    await supabase.storage.from("resumes").remove([oldPath]);
  }

  // 3. Delete old extracted data.
  await supabase.from("user_skills").delete().eq("user_id", activeUserId);
  await supabase.from("user_education").delete().eq("user_id", activeUserId);
  await supabase.from("user_experience").delete().eq("user_id", activeUserId);
  await supabase.from("user_projects").delete().eq("user_id", activeUserId);
  await supabase.from("user_domains").delete().eq("user_id", activeUserId);

  // 4. Upload the new file.
  const { error: uploadErr } = await supabase.storage
    .from("resumes")
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type || undefined
    });

  if (uploadErr) {
    throw new Error(`Failed to upload resume: ${uploadErr.message}`);
  }

  // 5. Upsert the new row in user_resume.
  const { data: urlData } = supabase.storage
    .from("resumes")
    .getPublicUrl(storagePath);
  const fileUrl = urlData.publicUrl;

  const resumePayload = {
    user_id: activeUserId,
    file_name: file.name,
    file_url: fileUrl,
    file_type: file.type || ext || "application/octet-stream",
    uploaded_at: new Date().toISOString(),
  };

  const { error: resumeLogErr } = await supabase
    .from("user_resume")
    .upsert(resumePayload);

  if (resumeLogErr) {
    throw new Error(`Failed to write resume metadata to database: ${resumeLogErr.message}`);
  }

  // 6. Parse it using Grok/Groq.
  const parsed = await parseResumeFile(file);

  // 7. Insert only the new extracted data.
  // Update profiles bio:
  if (parsed.bio && parsed.bio.trim()) {
    await supabase
      .from("profiles")
      .update({ bio: parsed.bio.trim() })
      .eq("id", activeUserId);
  }

  // Skills
  const rawSkills = [...(parsed.skills || []), ...(parsed.tech_stack || [])];
  const cleanSkills = [...new Set(rawSkills.map(s => s?.trim()).filter(s => !!s))];
  if (cleanSkills.length > 0) {
    const { data: dbSkills } = await supabase.from("skills").select("id, name");
    const mutableDbSkills = dbSkills || [];

    for (const skillName of cleanSkills) {
      const cleanSkill = skillName.trim();
      let skillId: string | null = null;
      const existing = mutableDbSkills.find(s => s.name?.toLowerCase() === cleanSkill.toLowerCase());

      if (existing) {
        skillId = existing.id;
      } else {
        const { data: newSkill, error: insertErr } = await supabase
          .from("skills")
          .insert({ name: cleanSkill })
          .select("id")
          .single();
        if (!insertErr && newSkill) {
          skillId = newSkill.id;
          mutableDbSkills.push({ id: skillId, name: cleanSkill });
        }
      }

      if (skillId) {
        const { error: linkErr } = await supabase
          .from("user_skills")
          .insert({ user_id: activeUserId, skill_id: skillId });
        if (!linkErr) summary.skillsAdded++;
      }
    }
  }

  // Education
  if (parsed.education && parsed.education.length > 0) {
    for (const edu of parsed.education) {
      if (!edu.degree || !edu.institution) continue;
      const { error: eduErr } = await supabase.from("user_education").insert({
        user_id: activeUserId,
        degree: edu.degree,
        institution: edu.institution,
        field_of_study: edu.field_of_study || null,
        start_year: edu.start_year || null,
        end_year: edu.end_year || null,
      });
      if (!eduErr) summary.educationAdded++;
    }
  }

  // Experience
  if (parsed.experiences && parsed.experiences.length > 0) {
    for (const exp of parsed.experiences) {
      if (!exp.title || !exp.company) continue;
      const { error: expErr } = await supabase.from("user_experience").insert({
        user_id: activeUserId,
        title: exp.title,
        company: exp.company,
        period: exp.period || null,
        description: exp.description || null,
      });
      if (!expErr) summary.experiencesAdded++;
    }
  }

  // Projects
  if (parsed.projects && parsed.projects.length > 0) {
    for (const proj of parsed.projects) {
      if (!proj.title) continue;
      const { error: projErr } = await supabase.from("user_projects").insert({
        user_id: activeUserId,
        title: proj.title,
        description: proj.description || null,
        tech_stack: proj.tech_stack || [],
        github_url: proj.github_url || null,
        live_url: proj.live_url || null,
      });
      if (!projErr) summary.projectsAdded++;
    }
  }

  // Domains
  const cleanDomains = [...new Set((parsed.domains || []).map(d => d?.trim()).filter(d => !!d))];
  for (const dom of cleanDomains) {
    await supabase.from("user_domains").insert({
      user_id: activeUserId,
      domain: dom,
    });
  }

  return summary;
}
