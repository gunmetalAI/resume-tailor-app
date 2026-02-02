import fs from "fs";
import path from "path";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import { getTemplate } from "../../lib/pdf-templates";
import { callAI } from "../../lib/ai-service";
import { getTemplateForProfile, slugToProfileName, getProfileBySlug } from "../../lib/profile-template-mapping";
import { loadTailoringGuide } from "../../lib/prompt-loader";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const { profile: profileSlug, jd, template, provider = "openai", model = null, companyName = null } = req.body;
    //const { profile: profileSlug, jd, template, provider = "claude", model = null, companyName = null } = req.body;

    if (!profileSlug) return res.status(400).send("Profile slug required");
    if (!jd) return res.status(400).send("Job description required");

    // Get profile configuration from slug
    const profileConfig = getProfileBySlug(profileSlug);
    if (!profileConfig) {
      return res.status(404).send(`Profile with slug "${profileSlug}" not found`);
    }

    const resumeName = profileConfig.resume;

    // Get template from profile mapping or use provided/default
    const templateName = template || getTemplateForProfile(profileSlug) || "Resume";

    // Validate provider
    if (!["claude", "openai"].includes(provider)) {
      return res.status(400).send(`Unsupported provider: ${provider}. Supported: claude, openai`);
    }

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
          throw new Error(`Failed to analyze job description technology requirements: ${error.message}`);
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
      // Use word boundaries to avoid false matches (e.g., "java" in "javascript")
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
        selectedResumeStack = "C#.NET"; // Handle special characters in filename
      } else if (hasWholeWord(techStacksLower, "python") || techStacksLower.includes("django")) {
        selectedResumeStack = "Python";
      } else {
        selectedResumeStack = "Node"; // Default for Web
      }
    }

    console.log(`Selected basic resume stack: ${selectedResumeStack}`);

    // Load the selected basic resume
    // Try different filename formats to handle special characters
    // Also check both root level and subdirectory
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
            // Handle case where only end_year is provided (e.g., "2014 –2015")
            const years = edu.start_year ? `${edu.start_year}-${edu.end_year}` : edu.end_year;
            eduStr += ` (${years})`;
          }
          // Grade is optional - only include if present
          if (edu.grade) eduStr += ` | GPA: ${edu.grade}`;
          parts.push(eduStr);
        });
      }

      return parts.join("\n");
    };

    const formattedBasicResume = formatBasicResume(basicResumeData);
    console.log("Basic resume loaded and formatted for prompt");

    // Calculate years of experience
    const calculateYears = (experience) => {
      if (!experience || experience.length === 0) return 0;

      const parseDate = (dateStr) => {
        if (dateStr.toLowerCase() === "present") return new Date();
        return new Date(dateStr);
      };

      const earliest = experience.reduce((min, job) => {
        const date = parseDate(job.start_date);
        return date < min ? date : min;
      }, new Date());

      const years = (new Date() - earliest) / (1000 * 60 * 60 * 24 * 365);
      return Math.round(years);
    };

    // Calculate years of experience from basic resume
    const yearsOfExperience = calculateYears(basicResumeData.experience);

    // Prepare variables for prompt template (using basic resume data)
    const workHistory = basicResumeData.experience.map((job, idx) => {
      const parts = [`${idx + 1}. ${job.company}`];
      if (job.title) parts.push(job.title);
      if (job.location) parts.push(job.location);
      parts.push(`${job.start_date} - ${job.end_date}`);
      return parts.join(' | ');
    }).join('\n');

    const education = basicResumeData.education.map(edu => {
      let eduStr = `- ${edu.degree}, ${edu.school} (${edu.start_year}-${edu.end_year})`;
      if (edu.grade) eduStr += ` | GPA: ${edu.grade}`;
      return eduStr;
    }).join('\n');

    // STEP 3: Create the second prompt with basic resume, job description, and tailoring guide
    console.log("Step 3: Preparing tailoring prompt with basic resume and job description...");

    // Load the tailoring guide (single file for all profiles)
    const tailoringGuide = loadTailoringGuide();

    // Build the comprehensive second prompt with basic resume
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

Return ONLY valid JSON: {"title":"...","summary":"...","skills":{"Category":["Skill1","Skill2"]},"experience":[{"title":"...","details":["bullet1","bullet2"]}]}`;

    const aiResponse = await callAI(tailoringPrompt, provider, model);

    // Log token usage to debug if we're hitting limits
    console.log(`${provider.toUpperCase()} API Response Metadata:`);
    console.log("- Provider:", aiResponse.provider);
    console.log("- Model:", aiResponse.model);
    console.log("- Stop reason:", aiResponse.stop_reason);
    console.log("- Input tokens:", aiResponse.usage?.input_tokens);
    console.log("- Output tokens:", aiResponse.usage?.output_tokens);

    let content;
    if (aiResponse.stop_reason === 'max_tokens' || aiResponse.stop_reason === 'length') {
      console.error(`⚠️ WARNING: ${provider.toUpperCase()} hit max_tokens limit! Response was truncated.`);
      console.log("🔄 Retrying with reduced requirements to fit in token limit...");

      // Retry with a more concise prompt
      const concisePrompt = prompt
        .replace(/TOTAL: 60-80 skills maximum/g, 'TOTAL: 50-60 skills maximum')
        .replace(/Per category: 8-12 skills/g, 'Per category: 6-10 skills')
        .replace(/6 bullets each/g, '5 bullets each')
        .replace(/5-6 bullets per job/g, '4-5 bullets per job');

      const retryResponse = await callAI(concisePrompt, provider, model);
      console.log("Retry Response Metadata:");
      console.log("- Stop reason:", retryResponse.stop_reason);
      console.log("- Output tokens:", retryResponse.usage?.output_tokens);

      content = retryResponse.content[0].text.trim();
    } else {
      content = aiResponse.content[0].text.trim();
    }

    // Check if AI is apologizing instead of returning JSON
    if (content.toLowerCase().startsWith("i'm sorry") ||
      content.toLowerCase().startsWith("i cannot") ||
      content.toLowerCase().startsWith("i apologize")) {
      console.error("AI is apologizing instead of returning JSON:", content.substring(0, 200));
      throw new Error("AI refused to generate resume. The prompt may be too complex. Please try again with a shorter job description or simpler requirements.");
    }

    // Enhanced JSON extraction - handle various formats
    // Remove markdown code blocks (case insensitive)
    content = content.replace(/```json\s*/gi, "");
    content = content.replace(/```javascript\s*/gi, "");
    content = content.replace(/```\s*/g, "");

    // Remove common prefixes
    content = content.replace(/^(here is|here's|this is|the json is):?\s*/gi, "");

    // Try to extract JSON from text if wrapped
    // Look for content between first { and last }
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      content = content.substring(firstBrace, lastBrace + 1);
    } else {
      console.error("No JSON object found in response");
      throw new Error("AI did not return valid JSON format. Please try again.");
    }

    content = content.trim();

    // Parse JSON with better error handling
    let resumeContent;
    try {
      resumeContent = JSON.parse(content);
    } catch (parseError) {
      console.error("=== JSON PARSE ERROR ===");
      console.error("Parse error:", parseError.message);
      console.error("Content length:", content.length);
      console.error("First 1000 chars:", content.substring(0, 1000));
      console.error("Last 500 chars:", content.substring(Math.max(0, content.length - 500)));

      // Try to fix common JSON issues
      try {
        // Remove trailing commas
        let fixedContent = content.replace(/,(\s*[}\]])/g, '$1');
        // Fix unescaped quotes in strings (basic attempt)
        fixedContent = fixedContent.replace(/([^\\])"([^",:}\]]*)":/g, '$1\\"$2":');
        resumeContent = JSON.parse(fixedContent);
        console.log("✅ Successfully parsed after fixing common issues");
      } catch (secondError) {
        console.error("Failed to parse even after fixes");
        throw new Error(`AI returned invalid JSON: ${parseError.message}. Please try again.`);
      }
    }

    // Validate required fields
    if (!resumeContent.title || !resumeContent.summary || !resumeContent.skills || !resumeContent.experience) {
      console.error("Missing required fields in AI response:", Object.keys(resumeContent));
      throw new Error("AI response missing required fields (title, summary, skills, or experience)");
    }

    console.log("✅ AI content generated successfully");
    console.log("Skills categories:", Object.keys(resumeContent.skills).length);
    console.log("Experience entries:", resumeContent.experience.length);

    // Debug: Check if experience has details
    resumeContent.experience.forEach((exp, idx) => {
      console.log(`Experience ${idx + 1}: ${exp.title || 'NO TITLE'} - Details count: ${exp.details?.length || 0}`);
      if (!exp.details || exp.details.length === 0) {
        console.error(`⚠️ WARNING: Experience entry ${idx + 1} has NO DETAILS!`);
      }
    });

    // Get React PDF template component
    const TemplateComponent = getTemplate(templateName);

    if (!TemplateComponent) {
      console.error(`Template not found: ${templateName}`);
      return res.status(404).send(`Template "${templateName}" not found`);
    }

    console.log(`Using template: ${templateName}`);

    // Prepare data for template (using basic resume data)
    const templateData = {
      name: basicResumeData.name,
      title: resumeContent.title || "Senior Software Engineer",
      email: basicResumeData.email,
      phone: basicResumeData.phone || null,
      location: basicResumeData.location,
      linkedin: null, // Excluded from resume
      website: null, // Excluded from resume
      summary: resumeContent.summary,
      skills: resumeContent.skills,
      experience: basicResumeData.experience.map((job, idx) => ({
        title: job.title || resumeContent.experience[idx]?.title || "Engineer",
        company: job.company,
        location: job.location,
        start_date: job.start_date,
        end_date: job.end_date,
        details: resumeContent.experience[idx]?.details || []
      })),
      education: basicResumeData.education
    };

    // Render PDF with React PDF
    const pdfDocument = React.createElement(TemplateComponent, { data: templateData });
    const pdfStream = await renderToStream(pdfDocument);

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of pdfStream) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    console.log("PDF generated successfully!");

    // Generate filename from resume name + company name (if provided)
    const nameParts = resumeName ? resumeName.trim().split(/\s+/) : [];
    let baseName;
    if (!nameParts || nameParts.length === 0) baseName = 'resume';
    else if (nameParts.length === 1) baseName = nameParts[0];
    else baseName = `${nameParts[0]}_${nameParts[nameParts.length - 1]}`;
    baseName = baseName.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");

    // Append company name if provided
    if (companyName && companyName.trim()) {
      const sanitizedCompanyName = companyName.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");
      baseName = `${baseName}_${sanitizedCompanyName}`;
    }

    const fileName = `${baseName}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.end(pdfBuffer);


  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).send("PDF generation failed: " + err.message);
  }
}
