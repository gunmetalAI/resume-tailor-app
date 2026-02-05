import fs from "fs";
import path from "path";
import { getProfileBySlug } from "../../lib/profile-template-mapping";
import { loadTailoringGuide } from "../../lib/prompt-loader";
import { callAI, getDefaultModel } from "../../lib/ai-service";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const { profile: profileSlug, jd } = req.body;

    if (!profileSlug) return res.status(400).send("Profile slug required");
    if (!jd) return res.status(400).send("Job description required");

    // Get profile configuration from slug
    const profileConfig = getProfileBySlug(profileSlug);
    if (!profileConfig) {
      return res.status(404).send(`Profile with slug "${profileSlug}" not found`);
    }

    const resumeName = profileConfig.resume;

    // Load profile JSON using resume name (check both root and subdirectory)
    console.log(`Loading profile: ${resumeName} (slug: ${profileSlug})`);
    
    // Try multiple possible paths: root level and subdirectory
    const possibleProfilePaths = [
      path.join(process.cwd(), "resumes", `${resumeName}.json`),
      path.join(process.cwd(), "resumes", resumeName, `${resumeName}.json`)
    ];
    
    let profilePath = null;
    for (const testPath of possibleProfilePaths) {
      if (fs.existsSync(testPath)) {
        profilePath = testPath;
        break;
      }
    }
    
    if (!profilePath) {
      return res.status(404).send(`Profile file "${resumeName}.json" not found in resumes/ or resumes/${resumeName}/`);
    }

    const profileData = JSON.parse(fs.readFileSync(profilePath, "utf-8"));

    // STEP 1: Analyze job description to extract technology category and tech stacks
    console.log("Step 1: Analyzing job description for technology requirements...");
    const validCategories = ["AI/ML/Data", "Web", "Mobile"];

    let techCategory = "Web";
    let techStacks = "";
    let techAnalysisAttempts = 0;
    const maxTechAnalysisRetries = 2;

    while (techAnalysisAttempts <= maxTechAnalysisRetries) {
      // Base prompt with job description (shared across attempts)
      const basePrompt = `Analyze the following job description and extract technology requirements.

Job Description:
${jd}`;

      const techAnalysisPrompt = techAnalysisAttempts === 0
        ? `${basePrompt}

Return your response in EXACTLY 2 lines:
Line 1: Category - one of these exact values: "AI/ML/Data", "Web", or "Mobile"
Line 2: Tech stacks - comma-separated list of technologies (e.g., React, Python, Golang, AWS)

Do not include any other text, explanations, or formatting.`
        : `${basePrompt}

CRITICAL: Return ONLY 2 lines, nothing else:
Line 1 must be EXACTLY one of: "AI/ML/Data" or "Web" or "Mobile"
Line 2 must be a comma-separated list of technologies only (e.g., React, Python, Golang, AWS)

Example format:
AI/ML/Data
Python, TensorFlow, PyTorch, AWS, PostgreSQL

Return ONLY the category on line 1 and tech stacks on line 2. No prefixes, no explanations.`;

      try {
        const provider = "openai";
        const model = null;
        const techAnalysisResponse = await callAI(techAnalysisPrompt, provider, model, 500);

        // Parse the tech analysis response
        const techAnalysisText = techAnalysisResponse.content[0].text.trim();
        const techAnalysisLines = techAnalysisText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // Extract category from first line
        if (techAnalysisLines.length >= 1) {
          const categoryLine = techAnalysisLines[0].replace(/^(line\s*1:?\s*|category:?\s*)/i, '').trim();
          if (validCategories.includes(categoryLine)) {
            techCategory = categoryLine;
          } else {
            // Try to find category in the line
            const foundCategory = validCategories.find(cat => categoryLine.toLowerCase().includes(cat.toLowerCase()));
            if (foundCategory) {
              techCategory = foundCategory;
            }
          }
        }

        // Extract tech stacks from second line
        if (techAnalysisLines.length >= 2) {
          techStacks = techAnalysisLines[1].replace(/^(line\s*2:?\s*|tech\s*stacks?:?\s*)/i, '').trim();
        }

        // Validate the response - check if we got valid data
        const isValidCategory = validCategories.includes(techCategory);
        const hasTechStacks = techStacks && techStacks.length > 0;

        if (isValidCategory && hasTechStacks) {
          console.log(`Technology Category: ${techCategory}`);
          console.log(`Tech Stacks: ${techStacks}`);
          break; // Success - exit retry loop
        } else {
          techAnalysisAttempts++;
          if (techAnalysisAttempts <= maxTechAnalysisRetries) {
            console.log(`Tech analysis validation failed. Category: ${techCategory}, TechStacks: ${techStacks ? 'present' : 'missing'}. Retrying with more explicit prompt... (Attempt ${techAnalysisAttempts + 1}/${maxTechAnalysisRetries + 1})`);
          } else {
            console.warn(`Tech analysis failed after ${maxTechAnalysisRetries + 1} attempts. Using defaults: Category=${techCategory}, TechStacks=${techStacks || 'empty'}`);
          }
        }
      } catch (error) {
        techAnalysisAttempts++;
        if (techAnalysisAttempts <= maxTechAnalysisRetries) {
          console.log(`Tech analysis error: ${error.message}. Retrying... (Attempt ${techAnalysisAttempts + 1}/${maxTechAnalysisRetries + 1})`);
        } else {
          console.error(`Tech analysis failed after ${maxTechAnalysisRetries + 1} attempts:`, error);
          // Use defaults instead of throwing
          console.warn(`Using defaults: Category=${techCategory}, TechStacks=${techStacks || 'empty'}`);
        }
      }
    }

    // STEP 2: Select and load the appropriate basic resume based on category and tech stacks
    console.log("Step 2: Selecting basic resume based on technology requirements...");

    let selectedResumeStack = "Node"; // Default fallback

    if (techCategory === "Mobile") {
      selectedResumeStack = "Mobile";
    } else if (techCategory === "AI/ML/Data") {
      selectedResumeStack = "AI";
    } else if (techCategory === "Web") {
      // Check tech stacks for Web category
      const techStacksLower = techStacks.toLowerCase();
      
      // Helper function to check for whole word matches
      const hasWholeWord = (text, word) => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(text);
      };
      
      if (hasWholeWord(techStacksLower, "go") || hasWholeWord(techStacksLower, "golang")) {
        selectedResumeStack = "Golang";
      } else if (hasWholeWord(techStacksLower, "java") || techStacksLower.includes("spring")) {
        selectedResumeStack = "Java";
      } else if (techStacksLower.includes("c#") || techStacksLower.includes(".net") || hasWholeWord(techStacksLower, "csharp")) {
        selectedResumeStack = "C#.NET";
      } else if (hasWholeWord(techStacksLower, "python") || techStacksLower.includes("django")) {
        selectedResumeStack = "Python";
      } else {
        selectedResumeStack = "Node";
      }
    }

    console.log(`Selected basic resume stack: ${selectedResumeStack}`);

    // Load the selected basic resume
    const possibleFilenames = [
      `${resumeName} ${selectedResumeStack}.json`,
      `${resumeName} ${selectedResumeStack.replace(/\./g, '.')}.json`,
      `${resumeName} ${selectedResumeStack.replace('#', '')}.json`
    ];

    let basicResumePath = null;
    let basicResumeData = null;

    // Try each filename in both root and subdirectory locations
    for (const filename of possibleFilenames) {
      const possiblePaths = [
        path.join(process.cwd(), "resumes", filename),
        path.join(process.cwd(), "resumes", resumeName, filename)
      ];
      
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          basicResumePath = testPath;
          break;
        }
      }
      
      if (basicResumePath) break;
    }

    if (!basicResumePath) {
      // Fallback: try the main profile file if stack-specific doesn't exist
      console.warn(`Basic resume file for stack "${selectedResumeStack}" not found. Using main profile data.`);
      basicResumeData = profileData;
    } else {
      console.log(`Loading basic resume from: ${path.basename(basicResumePath)}`);
      basicResumeData = JSON.parse(fs.readFileSync(basicResumePath, "utf-8"));
    }

    // Format basic resume for prompt (keep it structured and readable)
    const formatBasicResume = (resume) => {
      const parts = [];

      // Header information
      if (resume.name) parts.push(`Name: ${resume.name}`);
      if (resume.email) parts.push(`Email: ${resume.email}`);
      if (resume.location) parts.push(`Location: ${resume.location}`);

      // Summary (optional but recommended)
      if (resume.summary) {
        parts.push("\nSUMMARY:");
        parts.push(resume.summary);
      }

      // Skills section (top-level, supports both categorized and flat formats)
      if (resume.skills) {
        parts.push("\nSKILLS:");

        // Check if skills is an object (categorized) or string/array (flat)
        if (typeof resume.skills === 'object' && !Array.isArray(resume.skills)) {
          // Categorized format: {"Frontend": [...], "Backend": [...]}
          Object.entries(resume.skills).forEach(([category, skillList]) => {
            if (Array.isArray(skillList) && skillList.length > 0) {
              parts.push(`• ${category}: ${skillList.join(", ")}`);
            } else if (typeof skillList === 'string') {
              parts.push(`• ${category}: ${skillList}`);
            }
          });
        } else if (typeof resume.skills === 'string') {
          // Flat string format: "React.js | TypeScript | Node.js | ..."
          parts.push(resume.skills);
        } else if (Array.isArray(resume.skills)) {
          // Flat array format: ["React.js", "TypeScript", "Node.js", ...]
          parts.push(resume.skills.join(" | "));
        }
      }

      // Experience section with detailed bullets
      if (resume.experience && resume.experience.length > 0) {
        parts.push("\nEXPERIENCE:");
        resume.experience.forEach((job, idx) => {
          // Job header: Company, Title, Location, Period
          const headerParts = [];
          headerParts.push(`\n${idx + 1}. ${job.company}`);
          if (job.title) headerParts.push(`Title: ${job.title}`);
          if (job.location) headerParts.push(`Location: ${job.location}`);
          headerParts.push(`Period: ${job.start_date} - ${job.end_date}`);
          parts.push(headerParts.join(" | "));

          // Detailed bullet points (if provided)
          if (job.bullets && job.bullets.length > 0) {
            job.bullets.forEach(bullet => {
              parts.push(`   • ${bullet}`);
            });
          }
        });
      }

      // Education section
      if (resume.education && resume.education.length > 0) {
        parts.push("\nEDUCATION:");
        resume.education.forEach(edu => {
          let eduStr = `- ${edu.degree}, ${edu.school}`;
          if (edu.start_year && edu.end_year) {
            eduStr += ` (${edu.start_year}-${edu.end_year})`;
          } else if (edu.end_year) {
            const years = edu.start_year ? `${edu.start_year}-${edu.end_year}` : edu.end_year;
            eduStr += ` (${years})`;
          }
          if (edu.grade) eduStr += ` | GPA: ${edu.grade}`;
          parts.push(eduStr);
        });
      }

      return parts.join("\n");
    };

    const formattedBasicResume = formatBasicResume(basicResumeData);
    console.log("Basic resume loaded and formatted for prompt");

    // STEP 3: Create the prompt with basic resume, job description, and tailoring guide
    console.log("Step 3: Preparing tailoring prompt with basic resume and job description...");

    // Load the tailoring guide (single file for all profiles)
    const tailoringGuide = loadTailoringGuide();

    // Build the comprehensive prompt with basic resume
    const tailoringPrompt = `You are a world-class ATS optimization expert. Your task is to tailor a basic resume to match a specific job description.

## BASIC RESUME:
${formattedBasicResume}

---

## JOB DESCRIPTION:
${jd}

---

## TAILORING GUIDE:
${tailoringGuide}

---

**CRITICAL INSTRUCTIONS:**
1. Use the BASIC RESUME above as your foundation - preserve the candidate's actual experience, companies, dates, and education.
2. Each company experience's bullets number must be the same as the number of bullets in the BASIC RESUME for that company.
3. Tailor the content (title, summary, skills, and experience bullets) to match the JOB DESCRIPTION requirements.
4. Follow the TAILORING GUIDE above for formatting, keyword optimization, and ATS scoring guidelines.
5. Ensure all experience entries match the BASIC RESUME work history (same companies, titles, and date ranges).
6. Enhance and customize the experience bullets to align with JD requirements while staying truthful to the candidate's background.

Return ONLY valid JSON: {"title":"...","summary":"...","skills":{"Category":["Skill1","Skill2"]},"experience":[{"title":"...","details":["bullet1","bullet2"]}], "education":{...}}`;

    // Return the prompt
    res.status(200).json({
      prompt: tailoringPrompt,
      selectedResumeStack: selectedResumeStack,
      techCategory: techCategory,
      techStacks: techStacks
    });

  } catch (err) {
    console.error("Prompt preparation error:", err);
    res.status(500).send("Prompt preparation failed: " + err.message);
  }
}

