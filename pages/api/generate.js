import fs from "fs";
import path from "path";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import { getTemplate } from "../../lib/pdf-templates";
import { callAI, getDefaultModel } from "../../lib/ai-service";
import { getTemplateForProfile, slugToProfileName, getProfileBySlug } from "../../lib/profile-template-mapping";
import { loadTailoringGuide } from "../../lib/prompt-loader";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const { profile: profileSlug, jd, template, provider = "openai", model = null, companyName = null, aiResponse: manualAiResponse = null } = req.body;
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

    // If manual AI response is provided, skip Steps 1-3 and go directly to JSON parsing
    if (manualAiResponse) {
      console.log("Using manual AI response - skipping Steps 1-3, going directly to PDF generation");
      console.log("Manual response length:", manualAiResponse.length);
      console.log("Manual response preview (first 200):", manualAiResponse.substring(0, 200));
      console.log("Manual response preview (last 200):", manualAiResponse.substring(Math.max(0, manualAiResponse.length - 200)));
      
      // We still need basic resume data for PDF template, so use the main profile
      const basicResumeData = profileData;
      
      // Parse the manual AI response directly
      let content = manualAiResponse.trim();
      
      // Enhanced JSON extraction - handle various formats
      content = content.replace(/```json\s*/gi, "");
      content = content.replace(/```javascript\s*/gi, "");
      content = content.replace(/```\s*/g, "");
      content = content.replace(/^(here is|here's|this is|the json is):?\s*/gi, "");
      // Remove markdown separators that might appear after JSON
      content = content.replace(/\n---\n.*$/s, "");
      content = content.replace(/\n---.*$/s, "");
      content = content.trim();

      // First, try to parse the content directly (it might already be valid JSON)
      let resumeContent = null;
      try {
        resumeContent = JSON.parse(content);
        console.log("✅ Content is valid JSON - parsed directly");
      } catch (directParseError) {
        // If direct parse fails, try to extract JSON from the content
        console.log("Direct parse failed, attempting JSON extraction...");
        
        // Find the first opening brace
        const firstBrace = content.indexOf('{');
        if (firstBrace === -1) {
          console.error("No JSON object found in response");
          console.error("Content preview:", content.substring(0, 200));
          throw new Error("AI did not return valid JSON format. Please try again.");
        }

        // Find the matching closing brace by counting braces (ignoring braces inside strings)
        let braceCount = 0;
        let lastBrace = -1;
        let inString = false;
        let escapeNext = false;
        
        for (let i = firstBrace; i < content.length; i++) {
          const char = content[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          
          if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
          }
          
          // Only count braces when not inside a string
          if (!inString) {
            if (char === '{') {
              braceCount++;
            }
            if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                lastBrace = i;
                break;
              }
            }
          }
        }
        
        console.log(`Brace counting result: firstBrace=${firstBrace}, lastBrace=${lastBrace}, braceCount=${braceCount}, contentLength=${content.length}`);

        if (lastBrace === -1 || lastBrace <= firstBrace) {
          // Fallback: try to find valid JSON by testing different end positions
          console.warn("Brace counting failed, trying fallback extraction");
          let fallbackContent = content.substring(firstBrace);
          
          // First, try to parse the entire fallback content (might have trailing whitespace)
          let found = false;
          try {
            const trimmed = fallbackContent.trim();
            resumeContent = JSON.parse(trimmed);
            content = trimmed;
            console.log("✅ Fallback: Direct parse of trimmed content succeeded");
            found = true;
          } catch (e) {
            console.log("Direct parse of trimmed content failed, trying extraction...");
          }
          
          // If that didn't work, try to find JSON by looking for the last } that makes valid JSON
          // Start from the end and work backwards, testing each potential closing brace
          if (!found) {
            for (let i = fallbackContent.length - 1; i >= 0; i--) {
              if (fallbackContent[i] === '}') {
                try {
                  const testContent = fallbackContent.substring(0, i + 1);
                  // Try to parse it
                  resumeContent = JSON.parse(testContent);
                  // If parsing succeeds, use this content
                  content = testContent;
                  console.log(`✅ Fallback extraction succeeded at position ${i}`);
                  found = true;
                  break;
                } catch (e) {
                  // Continue searching - this wasn't a valid JSON end
                }
              }
            }
          }
          
          // If still no valid JSON found, try one more approach: find all } positions and test them
          if (!found) {
            console.warn("First fallback failed, trying alternative approach");
            // Collect all } positions
            const closingBraces = [];
            for (let i = 0; i < fallbackContent.length; i++) {
              if (fallbackContent[i] === '}') {
                closingBraces.push(i);
              }
            }
            
            console.log(`Found ${closingBraces.length} closing braces to test`);
            
            // Test from the last } backwards
            for (let i = closingBraces.length - 1; i >= 0; i--) {
              const bracePos = closingBraces[i];
              try {
                const testContent = fallbackContent.substring(0, bracePos + 1);
                resumeContent = JSON.parse(testContent);
                content = testContent;
                console.log(`✅ Alternative fallback extraction succeeded at position ${bracePos}`);
                found = true;
                break;
              } catch (e) {
                // Continue
              }
            }
          }
          
          // Last resort: try to find JSON by progressively trimming from the end
          if (!found) {
            console.warn("All fallbacks failed, trying progressive trimming");
            // Remove any trailing whitespace, newlines, or markdown separators
            let trimmed = fallbackContent.trim();
            // Remove trailing --- or other separators
            trimmed = trimmed.replace(/\s*---.*$/s, '').trim();
            
            // Try parsing progressively shorter versions
            for (let trimAmount = 0; trimAmount < Math.min(100, trimmed.length); trimAmount += 5) {
              try {
                const testContent = trimmed.substring(0, trimmed.length - trimAmount);
                resumeContent = JSON.parse(testContent);
                content = testContent;
                console.log(`✅ Progressive trimming succeeded (trimmed ${trimAmount} chars)`);
                found = true;
                break;
              } catch (e) {
                // Continue
              }
            }
          }
          
          // If still no valid JSON found, throw error
          if (!found || !resumeContent) {
            console.error("No complete JSON object found in response");
            console.error("First brace at:", firstBrace);
            console.error("Last brace at:", lastBrace);
            console.error("Brace count:", braceCount);
            console.error("Content length:", content.length);
            console.error("Fallback content length:", fallbackContent.length);
            console.error("Content preview (first 500):", content.substring(0, 500));
            console.error("Content preview (last 500):", content.substring(Math.max(0, content.length - 500)));
            console.error("Fallback content (last 100):", fallbackContent.substring(Math.max(0, fallbackContent.length - 100)));
            throw new Error("AI did not return valid JSON format. Please try again.");
          }
        } else {
          // Extract only the JSON part
          content = content.substring(firstBrace, lastBrace + 1).trim();
          try {
            resumeContent = JSON.parse(content);
            console.log("✅ JSON extracted and parsed successfully");
          } catch (extractParseError) {
            console.error("Failed to parse extracted JSON:", extractParseError.message);
            throw new Error(`AI returned invalid JSON: ${extractParseError.message}. Please try again.`);
          }
        }
      }

      // resumeContent is already parsed above, so we can proceed to validation

      // Validate required fields
      if (!resumeContent.title || !resumeContent.summary || !resumeContent.skills || !resumeContent.experience) {
        console.error("Missing required fields in AI response:", Object.keys(resumeContent));
        throw new Error("AI response missing required fields (title, summary, skills, or experience)");
      }

      console.log("✅ AI content parsed successfully");
      console.log("Skills categories:", Object.keys(resumeContent.skills).length);
      console.log("Experience entries:", resumeContent.experience.length);
      console.log("Basic resume experience entries:", basicResumeData.experience?.length || 0);

      // Get React PDF template component
      const TemplateComponent = getTemplate(templateName);

      if (!TemplateComponent) {
        console.error(`Template not found: ${templateName}`);
        return res.status(404).send(`Template "${templateName}" not found`);
      }

      console.log(`Using template: ${templateName}`);

      // Helper function to normalize company names for matching
      const normalizeCompanyName = (name) => {
        if (!name) return "";
        return name.toLowerCase()
          .replace(/[.,]/g, "")
          .replace(/\s+/g, " ")
          .trim();
      };

      // Parse GPT experience title to extract company for matching
      // Handles multiple formats:
      // - "Title, Company (Dates)" - e.g., "Sr. Software Engineer, SS&C Advent (Jan 2019 - Present)"
      // - "Company — Title (Dates)" - e.g., "SS&C Advent — Sr. Software Engineer (Jan 2019 - Present)"
      // - "Title | Company | Dates" - e.g., "Senior Software Engineer | VC3 | Feb 2020 - Present"
      const extractCompanyFromGPTTitle = (titleStr) => {
        if (!titleStr) return "";
        
        // Try format: "Title, Company (Dates)" - company is after the comma, before the parenthesis
        if (titleStr.includes(",") && titleStr.includes("(")) {
          const commaIndex = titleStr.indexOf(",");
          const parenIndex = titleStr.indexOf("(");
          if (commaIndex < parenIndex) {
            const companyPart = titleStr.substring(commaIndex + 1, parenIndex).trim();
            if (companyPart.length > 0) {
              return companyPart;
            }
          }
        }
        
        // Try format: "Company — Title (Dates)" - handle various dash types
        const dashPatterns = [" — ", " - ", " – ", " —", " — "];
        for (const dash of dashPatterns) {
          if (titleStr.includes(dash)) {
            const parts = titleStr.split(dash).map(p => p.trim());
            if (parts.length >= 1 && parts[0].length > 0) {
              // Check if first part looks like a company (doesn't contain common job title words)
              const firstPart = parts[0];
              const titleWords = ["engineer", "developer", "architect", "manager", "analyst", "specialist"];
              const isLikelyTitle = titleWords.some(word => firstPart.toLowerCase().includes(word));
              if (!isLikelyTitle) {
                return firstPart; // Company is the first part
              }
            }
          }
        }
        
        // Try format: "Title | Company | Dates"
        if (titleStr.includes("|")) {
          const parts = titleStr.split("|").map(p => p.trim()).filter(p => p.length > 0);
          if (parts.length >= 2) {
            return parts[1]; // Company is the second part
          }
        }
        
        return "";
      };

      // Match GPT experiences to basic resume experiences
      // Use basic resume metadata (company, title, location, dates) but GPT's tailored details
      const matchedExperience = basicResumeData.experience.map((basicExp, idx) => {
        const basicCompany = normalizeCompanyName(basicExp.company || "");
        
        // Try to find matching GPT experience by company name
        let matchedGPTExp = null;
        for (const gptExp of resumeContent.experience) {
          const gptCompany = normalizeCompanyName(extractCompanyFromGPTTitle(gptExp.title || ""));
          
          // Only match if both company names are non-empty (avoid matching empty strings)
          if (gptCompany && basicCompany && 
              (gptCompany === basicCompany || 
               gptCompany.includes(basicCompany) || 
               basicCompany.includes(gptCompany))) {
            matchedGPTExp = gptExp;
            console.log(`✅ Matched basic resume experience "${basicExp.company}" with GPT experience (extracted: "${extractCompanyFromGPTTitle(gptExp.title || "")}")`);
            break;
          }
        }
        
        // If no match found by company, try by index as fallback (for same order)
        if (!matchedGPTExp && idx < resumeContent.experience.length) {
          matchedGPTExp = resumeContent.experience[idx];
          const extractedCompany = extractCompanyFromGPTTitle(matchedGPTExp.title || "");
          console.log(`⚠️ No company match found for "${basicExp.company}" at index ${idx}, using index-based fallback (GPT title: "${matchedGPTExp.title}", extracted: "${extractedCompany}")`);
        }
        
        // Use basic resume metadata, but GPT's tailored details if available
        // Template expects 'details', but basic resume may use 'bullets'
        // IMPORTANT: Create a copy of the details array to avoid reference issues
        const gptDetails = matchedGPTExp?.details ? [...matchedGPTExp.details] : [];
        const basicDetails = basicExp.details || basicExp.bullets || [];
        
        if (matchedGPTExp) {
          console.log(`[Final Match ${idx}] Company: "${basicExp.company}" | GPT details count: ${gptDetails.length} | First detail: "${gptDetails[0]?.substring(0, 50) || 'NONE'}..."`);
        }
        
        return {
          title: basicExp.title || "Engineer",
          company: basicExp.company || "",
          location: basicExp.location || null,
          start_date: basicExp.start_date || "",
          end_date: basicExp.end_date || "",
          // Use GPT's tailored details if matched, otherwise fall back to basic resume
          // Create a new array to ensure no reference issues
          details: gptDetails.length > 0 ? [...gptDetails] : [...basicDetails]
        };
      });

      console.log(`✅ Matched ${matchedExperience.length} experience entries (using basic resume metadata with GPT details)`);

      // Helper function to clean resume title by removing parenthetical info and everything after role keywords
      const cleanResumeTitle = (title) => {
        if (!title) return title;
        
        const roleKeywords = ["Engineer", "Developer", "Specialist", "Architect", "Scientist", "Analyst", "Consultant", "Programmer", "Tester", "Lead", "SDET"];
        
        // Find the last occurrence of any role keyword
        let lastKeywordIndex = -1;
        let matchedKeyword = "";
        
        for (const keyword of roleKeywords) {
          const index = title.lastIndexOf(keyword);
          if (index > lastKeywordIndex) {
            lastKeywordIndex = index;
            matchedKeyword = keyword;
          }
        }
        
        if (lastKeywordIndex !== -1) {
          // Extract up to and including the keyword
          const cleaned = title.substring(0, lastKeywordIndex + matchedKeyword.length).trim();
          return cleaned;
        }
        
        // If no keyword found, return original title
        return title;
      };

      // Clean the title
      const cleanedTitle = cleanResumeTitle(resumeContent.title || "Senior Software Engineer");
      
      // Clean the summary by replacing any full title references with cleaned title
      let cleanedSummary = resumeContent.summary || "";
      if (resumeContent.title && resumeContent.title !== cleanedTitle) {
        // Replace the full title with cleaned title in summary
        const fullTitleRegex = new RegExp(resumeContent.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        cleanedSummary = cleanedSummary.replace(fullTitleRegex, cleanedTitle);
      }

      // Helper function to transform a single education object to template format.
      // We now REQUIRE the AI to return start_year and end_year explicitly.
      const transformSingleEducation = (eduObj) => {
        if (!eduObj || typeof eduObj !== "object") return {};

        const edu = {
          degree: eduObj.degree || "",
          school: eduObj.institution || eduObj.school || "",
          start_year: eduObj.start_year || eduObj.startYear || "",
          end_year: eduObj.end_year || eduObj.endYear || "",
        };
        
        // Include grade if present
        if (eduObj.grade) edu.grade = eduObj.grade;
        
        return edu;
      };

      // Helper function to transform AI education format to template format
      const transformEducation = (aiEducation) => {
        if (!aiEducation) return null;
        
        // If it's already an array (from AI response or basic resume)
        if (Array.isArray(aiEducation)) {
          // Transform each education entry in the array
          return aiEducation.map(transformSingleEducation);
        }
        
        // If it's an object (backward compatibility for single education), transform and wrap in array
        if (typeof aiEducation === 'object') {
          return [transformSingleEducation(aiEducation)];
        }
        
        return null;
      };

      // Use AI education if available, otherwise fall back to basic resume education
      const educationData = resumeContent.education 
        ? transformEducation(resumeContent.education) 
        : (basicResumeData.education || []);

      // Prepare data for template (using basic resume data)
      const templateData = {
        name: basicResumeData.name,
        title: cleanedTitle,
        email: basicResumeData.email,
        phone: basicResumeData.phone || null,
        location: basicResumeData.location,
        linkedin: null,
        website: null,
        summary: cleanedSummary,
        skills: resumeContent.skills,
        experience: matchedExperience,
        education: educationData
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
      return; // Exit early - PDF generated
    }

    // Determine which model will be used (matching the logic in callOpenAI/callClaude)
    let actualModel = model;
    if (!actualModel) {
      actualModel = getDefaultModel(provider);
    }
    if (!actualModel) {
      // Fallback to environment variable or default
      if (provider === "openai") {
        actualModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
      } else if (provider === "claude") {
        actualModel = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
      }
    }
    console.log(`Using ${provider.toUpperCase()} model: ${actualModel}`);

    // STEP 1: Analyze job description to extract technology category and tech stacks
    console.log("Step 1: Analyzing job description for technology requirements...");
    const validCategories = ["AI/ML/Data", "Web", "Mobile", "QA/Automation/Testing"];

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
Line 1: Category - one of these exact values: "AI/ML/Data", "Web", "Mobile", or "QA/Automation/Testing"
Line 2: Tech stacks - comma-separated list of technologies (e.g., React, Python, Golang, AWS)

Do not include any other text, explanations, or formatting.`
        : `${basePrompt}

CRITICAL: Return ONLY 2 lines, nothing else:
Line 1 must be EXACTLY one of: "AI/ML/Data" or "Web" or "Mobile" or "QA/Automation/Testing"
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
          // If AI continues to fail (e.g., network issues), fall back to sensible defaults
          console.error(`Tech analysis failed after ${maxTechAnalysisRetries + 1} attempts:`, error);
          console.warn('Falling back to default technology analysis: Category="Web", Stack="Node". Continuing with basic resume selection.');
          techCategory = "Web";
          techStacks = "";
          break; // Exit retry loop and continue with default Web/Node path
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
    } else if (techCategory === "QA/Automation/Testing") {
      selectedResumeStack = "QA";
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

Return ONLY valid JSON: {"title":"...","summary":"...","skills":{"Category":["Skill1","Skill2"]},"experience":[{"title":"...","details":["bullet1","bullet2"]}], "education":[{degree: "...", school: "...", start_year: "...", end_year: "..."}, {...}]}`;

    let content;
    // If manual AI response is provided, use it directly; otherwise call AI
    if (manualAiResponse) {
      console.log("Using manual AI response (skipping AI call)");
      content = manualAiResponse.trim();
    } else {
      const aiResponse = await callAI(tailoringPrompt, provider, model);

      // Log token usage to debug if we're hitting limits
      console.log(`${provider.toUpperCase()} API Response Metadata:`);
      console.log("- Provider:", aiResponse.provider);
      console.log("- Model:", aiResponse.model);
      console.log("- Stop reason:", aiResponse.stop_reason);
      console.log("- Input tokens:", aiResponse.usage?.input_tokens);
      console.log("- Output tokens:", aiResponse.usage?.output_tokens);

      if (aiResponse.stop_reason === 'max_tokens' || aiResponse.stop_reason === 'length') {
        console.error(`⚠️ WARNING: ${provider.toUpperCase()} hit max_tokens limit! Response was truncated.`);
        console.log("🔄 Retrying with reduced requirements to fit in token limit...");

        // Retry with a more concise prompt
        const concisePrompt = tailoringPrompt
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

    // Parse the JSON content
    let resumeContent;
    try {
      resumeContent = JSON.parse(content);
      console.log("✅ Content parsed successfully");
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError.message);
      throw new Error(`AI returned invalid JSON: ${parseError.message}. Please try again.`);
    }

    // Validate required fields
    if (!resumeContent.title || !resumeContent.summary || !resumeContent.skills || !resumeContent.experience) {
      console.error("Missing required fields in AI response:", Object.keys(resumeContent));
      throw new Error("AI response missing required fields (title, summary, skills, or experience)");
    }

    console.log("✅ AI content generated successfully");
    console.log("Skills categories:", Object.keys(resumeContent.skills).length);
    console.log("Experience entries:", resumeContent.experience.length);

    // Debug: Check if experience has details and log the first few details of each
    resumeContent.experience.forEach((exp, idx) => {
      const title = exp.title || 'NO TITLE';
      const detailsCount = exp.details?.length || 0;
      const firstDetail = exp.details?.[0]?.substring(0, 50) || 'NONE';
      console.log(`[GPT Response] Experience ${idx}: Title="${title}" | Details count: ${detailsCount} | First detail: "${firstDetail}..."`);
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

    // Helper function to clean resume title by removing parenthetical info and everything after role keywords
    const cleanResumeTitle = (title) => {
      if (!title) return title;
      
      const roleKeywords = ["Engineer", "Developer", "Specialist", "Architect", "Scientist", "Analyst", "Consultant", "Programmer", "Tester", "Lead", "SDET"];
      
      // Find the last occurrence of any role keyword
      let lastKeywordIndex = -1;
      let matchedKeyword = "";
      
      for (const keyword of roleKeywords) {
        const index = title.lastIndexOf(keyword);
        if (index > lastKeywordIndex) {
          lastKeywordIndex = index;
          matchedKeyword = keyword;
        }
      }
      
      if (lastKeywordIndex !== -1) {
        // Extract up to and including the keyword
        const cleaned = title.substring(0, lastKeywordIndex + matchedKeyword.length).trim();
        return cleaned;
      }
      
      // If no keyword found, return original title
      return title;
    };

    // Clean the title
    const cleanedTitle = cleanResumeTitle(resumeContent.title || "Senior Software Engineer");
    
    // Clean the summary by replacing any full title references with cleaned title
    let cleanedSummary = resumeContent.summary || "";
    if (resumeContent.title && resumeContent.title !== cleanedTitle) {
      // Replace the full title with cleaned title in summary
      const fullTitleRegex = new RegExp(resumeContent.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      cleanedSummary = cleanedSummary.replace(fullTitleRegex, cleanedTitle);
    }

    // Helper function to transform a single education object to template format.
    // We now REQUIRE the AI to return start_year and end_year explicitly.
    const transformSingleEducation = (eduObj) => {
      if (!eduObj || typeof eduObj !== "object") return {};

      const edu = {
        degree: eduObj.degree || "",
        school: eduObj.institution || eduObj.school || "",
        start_year: eduObj.start_year || eduObj.startYear || "",
        end_year: eduObj.end_year || eduObj.endYear || "",
      };
      
      // Include grade if present
      if (eduObj.grade) edu.grade = eduObj.grade;
      
      return edu;
    };

    // Helper function to transform AI education format to template format
    const transformEducation = (aiEducation) => {
      if (!aiEducation) return null;
      
      // If it's already an array (from AI response or basic resume)
      if (Array.isArray(aiEducation)) {
        // Transform each education entry in the array
        return aiEducation.map(transformSingleEducation);
      }
      
      // If it's an object (backward compatibility for single education), transform and wrap in array
      if (typeof aiEducation === 'object') {
        return [transformSingleEducation(aiEducation)];
      }
      
      return null;
    };

    // Use AI education if available, otherwise fall back to basic resume education
    const educationData = resumeContent.education 
      ? transformEducation(resumeContent.education) 
      : (basicResumeData.education || []);

    // Helper function to normalize company names for matching
    const normalizeCompanyName = (name) => {
      if (!name) return "";
      return name.toLowerCase()
        .replace(/[.,]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    // Parse GPT experience title to extract company for matching
    // Handles multiple formats:
    // - "Title, Company (Dates)" - e.g., "Sr. Software Engineer, SS&C Advent (Jan 2019 - Present)"
    // - "Company — Title (Dates)" - e.g., "SS&C Advent — Sr. Software Engineer (Jan 2019 - Present)"
    // - "Title | Company | Dates" - e.g., "Senior Software Engineer | VC3 | Feb 2020 - Present"
    const extractCompanyFromGPTTitle = (titleStr) => {
      if (!titleStr) return "";
      
      // Try format: "Title, Company (Dates)" - company is after the comma, before the parenthesis
      if (titleStr.includes(",") && titleStr.includes("(")) {
        const commaIndex = titleStr.indexOf(",");
        const parenIndex = titleStr.indexOf("(");
        if (commaIndex < parenIndex) {
          const companyPart = titleStr.substring(commaIndex + 1, parenIndex).trim();
          if (companyPart.length > 0) {
            return companyPart;
          }
        }
      }
      
      // Try format: "Company — Title (Dates)" - handle various dash types
      const dashPatterns = [" — ", " - ", " – ", " —", " — "];
      for (const dash of dashPatterns) {
        if (titleStr.includes(dash)) {
          const parts = titleStr.split(dash).map(p => p.trim());
          if (parts.length >= 1 && parts[0].length > 0) {
            // Check if first part looks like a company (doesn't contain common job title words)
            const firstPart = parts[0];
            const titleWords = ["engineer", "developer", "architect", "manager", "analyst", "specialist"];
            const isLikelyTitle = titleWords.some(word => firstPart.toLowerCase().includes(word));
            if (!isLikelyTitle) {
              return firstPart; // Company is the first part
            }
          }
        }
      }
      
      // Try format: "Title | Company | Dates"
      if (titleStr.includes("|")) {
        const parts = titleStr.split("|").map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length >= 2) {
          return parts[1]; // Company is the second part
        }
      }
      
      return "";
    };

    // Match GPT experiences to basic resume experiences
    // Use basic resume metadata (company, title, location, dates) but GPT's tailored details
    // Since GPT response order matches basic resume order, use direct index-based matching
    const matchedExperience = basicResumeData.experience.map((basicExp, idx) => {
      // Direct index-based matching - GPT response should be in same order as basic resume
      let matchedGPTExp = null;
      
      if (idx < resumeContent.experience.length) {
        // IMPORTANT: Create a copy to avoid reference issues
        matchedGPTExp = resumeContent.experience[idx];
        
        // Debug: Log what we're matching
        const gptTitle = matchedGPTExp?.title || "";
        const extractedCompany = extractCompanyFromGPTTitle(gptTitle);
        const basicCompany = basicExp.company || "";
        const gptDetailsCount = matchedGPTExp?.details?.length || 0;
        const firstGptDetail = matchedGPTExp?.details?.[0]?.substring(0, 60) || 'NONE';
        
        console.log(`[Matching ${idx}] Basic company: "${basicCompany}"`);
        console.log(`[Matching ${idx}] GPT title: "${gptTitle}" | Extracted company: "${extractedCompany}"`);
        console.log(`[Matching ${idx}] GPT details count: ${gptDetailsCount} | First detail: "${firstGptDetail}..."`);
        
        // Verify we're getting the right experience by checking details
        if (gptDetailsCount > 0) {
          console.log(`[Matching ${idx}] ✅ Will use GPT details (${gptDetailsCount} bullets) for "${basicCompany}"`);
        } else {
          console.warn(`[Matching ${idx}] ⚠️ GPT experience has no details for "${basicCompany}"`);
        }
      } else {
        console.warn(`[Matching ${idx}] No GPT experience at index ${idx} (GPT has ${resumeContent.experience.length} experiences)`);
      }
      
      // Use basic resume metadata, but GPT's tailored details if available
      // Template expects 'details', but basic resume may use 'bullets'
      // IMPORTANT: Create a new array to avoid reference issues
      const gptDetails = matchedGPTExp?.details ? [...matchedGPTExp.details] : [];
      const basicDetails = basicExp.details || basicExp.bullets || [];
      
      if (!matchedGPTExp) {
        console.error(`❌ No GPT experience found for "${basicExp.company}" at index ${idx} - using basic resume details`);
      } else if (gptDetails.length === 0) {
        console.warn(`⚠️ GPT experience found for "${basicExp.company}" at index ${idx} but has no details - using basic resume details`);
      } else {
        console.log(`✅ Final: Using ${gptDetails.length} GPT details for "${basicExp.company}" at index ${idx}`);
      }
      
      return {
        title: basicExp.title || "Engineer",
        company: basicExp.company || "",
        location: basicExp.location || null,
        start_date: basicExp.start_date || "",
        end_date: basicExp.end_date || "",
        // Use GPT's tailored details if matched, otherwise fall back to basic resume
        // Create a new array to ensure we don't have reference issues
        details: gptDetails.length > 0 ? [...gptDetails] : [...basicDetails]
      };
    });

    console.log(`✅ Matched ${matchedExperience.length} experience entries (using basic resume metadata with GPT details)`);

    // Prepare data for template (using basic resume data)
    const templateData = {
      name: basicResumeData.name,
      title: cleanedTitle,
      email: basicResumeData.email,
      phone: basicResumeData.phone || null,
      location: basicResumeData.location,
      linkedin: null, // Excluded from resume
      website: null, // Excluded from resume
      summary: cleanedSummary,
      skills: resumeContent.skills,
      experience: matchedExperience,
      education: educationData
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
