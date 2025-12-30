import fs from "fs";
import path from "path";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import { getTemplate } from "../../lib/pdf-templates";
import { callAI } from "../../lib/ai-service";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const { profile, jd, template, provider = "claude", model = null, companyName = null } = req.body;

    if (!profile) return res.status(400).send("Profile required");
    if (!jd) return res.status(400).send("Job description required");

    // Default to Resume if no template specified
    const templateName = template || "Resume";

    // Validate provider
    if (!["claude", "openai"].includes(provider)) {
      return res.status(400).send(`Unsupported provider: ${provider}. Supported: claude, openai`);
    }

    // Load profile JSON
    console.log(`Loading profile: ${profile}`);
    const profilePath = path.join(process.cwd(), "resumes", `${profile}.json`);

    if (!fs.existsSync(profilePath)) {
      return res.status(404).send(`Profile "${profile}" not found`);
    }

    const profileData = JSON.parse(fs.readFileSync(profilePath, "utf-8"));


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

    const yearsOfExperience = calculateYears(profileData.experience);

    // AI PROMPT: Generate ATS-optimized resume content as JSON
    const prompt = `You are a world-class ATS optimization expert. Create a resume that scores 95-100% on ATS.

**🚨 CRITICAL OUTPUT: Return ONLY valid JSON. No markdown, explanations, or extra text.**
Format: {"title":"...","summary":"...","skills":{...},"experience":[...]}

***Wrap ONLY the critical JD keywords within each section using <strong> tags. Do NOT wrap metrics, verbs, or filler terms.***


## PROFILE DATA:
**Candidate:** ${profileData.name}
**Contact:** ${profileData.email} | ${profileData.location}
**Experience:** ${yearsOfExperience} years

**WORK HISTORY:**
${profileData.experience.map((job, idx) => {
      const parts = [`${idx + 1}. ${job.company}`];
      if (job.title) parts.push(job.title);
      if (job.location) parts.push(job.location);
      parts.push(`${job.start_date} - ${job.end_date}`);
      return parts.join(' | ');
    }).join('\n')}

**EDUCATION:**
${profileData.education.map(edu => {
      let eduStr = `- ${edu.degree}, ${edu.school} (${edu.start_year}-${edu.end_year})`;
      if (edu.grade) eduStr += ` | GPA: ${edu.grade}`;
      return eduStr;
    }).join('\n')}

---

## JOB DESCRIPTION:
${jd}

---

## INSTRUCTIONS:

### **1. EXTRACT DOMAIN KEYWORDS** (Critical for 98%+ score)

Analyze JD "About Us" section for **10-15 domain/compliance keywords** specific to company's product/industry:

**Examples by Domain:**
- **Identity/Security:** passwordless authentication, zero-trust architecture, OAuth2, JWT, SAML, OpenID Connect, WebAuthn, FIDO2, MFA, SSO, biometric security, encryption, key management, PKI, SOC 2, ISO 27001, GDPR
- **Payments/FinTech:** PCI-DSS compliance, payment processing, payment infrastructure, fraud detection, KYC/AML, 3D Secure, tokenization, ACH transfers, subscription billing, reconciliation, merchant services, SOC 2
- **Healthcare:** HIPAA compliance, HL7, FHIR, DICOM, PHI protection, EHR systems, EMR, Epic integration, Cerner, patient privacy, FDA compliance, HITRUST
- **Data/Analytics:** data warehousing, data governance, Snowflake, data lake, data lakehouse, GDPR compliance, data residency, PII protection, data quality, data lineage

**WHERE TO USE:**
- Summary: 3-5 domain keywords (lines 2-4)
- Skills: Dedicated domain category with 10-15 keywords
- Experience: Each role must include 2–3 bullets total that naturally incorporate domain or compliance keywords.

---

### **2. TITLE**
- Use EXACT job title from JD
- Examples: "Senior Data Scientist", "Senior Full Stack Engineer", "DevOps Engineer"

---

### **3. SUMMARY** (5-6 lines, 8-12 JD keywords + 3-5 domain keywords)

**Structure:**
- **Line 1:** [JD Title] with ${yearsOfExperience}+ years in [domain from JD] across startup and enterprise environments
- **Line 2:** Expertise in [domain keyword] + [3-4 EXACT JD technologies WITH versions if specified]
- **Line 3:** Proven track record in [domain keyword] + [key achievement with metric: %, $, time, scale]
- **Line 4:** Proficient in [3-4 more JD technologies/methodologies]
- **Line 5:** [Soft skill from JD] professional with experience in [Agile/leadership/collaboration] in fast-paced environments
- **Line 6:** Strong focus on [2-3 key JD skill areas] and delivering scalable, production-ready solutions

**Example (FinTech):**
"Senior Full Stack Engineer with 8+ years building scalable fintech platforms. Expertise in **payment processing systems**, **PCI-DSS compliance**, React.js 18, Node.js 20, and PostgreSQL. Proven track record implementing **fraud detection algorithms** that reduced chargebacks by 40% and processed $500M+ annually. Proficient in AWS infrastructure, Docker, Kubernetes, and **KYC/AML compliance frameworks**. Collaborative problem-solver with experience leading cross-functional teams in fast-paced startup environments. Strong focus on secure payment infrastructure, regulatory compliance, and delivering high-performance financial applications."

---

### **4. SKILLS** (60–75 total skills across 6–7 categories, prioritizing JD keywords over breadth.)

**Rules:**
- Create categories based on JD focus (Frontend, Backend, Cloud, DevOps, Security, etc.)
- 8-12 skills per category
- The categories MUST contain skills technically correct. "e.g.: Node.js or .NET is not programming language"
- Capitalize first letter of each skill
- NO version spam: "React.js" NOT "React.js 18, React.js 17, React.js 16"
- NO database spam: "PostgreSQL" NOT "PostgreSQL 15, 14, 13"
- Group cloud services: "AWS (Lambda, S3, EC2, RDS)" NOT 25 separate items
- 70% JD keywords + 30% complementary skills

**Example (Full Stack Engineer):**
\`\`\`json
"skills": {
  "Frontend": ["React.js", "Next.js", "TypeScript", "JavaScript", "Tailwind CSS", "Redux", "Vue.js", "HTML5", "CSS3"],
  "Backend": ["Node.js", "Express.js", "Python", "Django", "FastAPI", "GraphQL", "REST APIs"],
  "Databases": ["PostgreSQL", "MongoDB", "Redis", "MySQL", "Elasticsearch"],
  "Cloud & Infrastructure": ["AWS (Lambda, S3, EC2, RDS, CloudFront)", "Docker", "Kubernetes", "Terraform"],
  "DevOps & CI/CD": ["GitLab CI/CD", "GitHub Actions", "Jenkins", "Datadog", "Prometheus"],
  "Testing": ["Jest", "Cypress", "Playwright", "React Testing Library"],
  "Payment & Compliance": ["PCI-DSS", "Payment processing", "Stripe", "Fraud detection", "KYC/AML", "SOC 2"],
  "Tools": ["Git", "Webpack", "Vite", "Figma", "Jira"]
}
\`\`\`
Total: ~70 skills (scannable and professional)

**If relevant, create domain-specific category:**
- FinTech → "Payment & Compliance"
- Healthcare → "Healthcare Compliance & Standards"
- Security → "Security & Identity"
- Data → "Data Governance & Compliance"

---

### **5. EXPERIENCE** (${profileData.experience.length} entries, 6-8 bullets each)

**Requirements:**
- Generate ${profileData.experience.length} job entries matching work history
- 6-8 bullets per job (most recent jobs get 8, older jobs 5-6)
- 20–40 words per bullet, optimized for clarity and natural senior-engineer tone.
- For each work experience, ensure all technologies listed were widely available and commonly used in production during that role’s time period; do not include tools, frameworks, or practices released after the role ended or unlikely to have been adopted in that era.
- Include 2-4 JD keywords per bullet
- EVERY bullet needs a metric (%, $, time, scale, users)
- Metrics have to be approximate. Use ranges or natural phrasing (e.g., ‘~40%’, ‘significant reduction’, ‘hundreds of thousands of users’) when precise figures may feel unnatural. Ensure at least 50–60% of bullets include a metric, while the remainder focus on scope, ownership, or architectural impact.
- Add industry context to 2-3 bullets per job
- Prioritize JD keywords by frequency in the following order: Job Title > Core Technologies > Domain Compliance > Soft Skills.

**Bullet Structure:**
[Action Verb] + [JD Technology] + [what you built] + [business impact] + [metric]

**Action Verbs:**
✅ USE: Architected, Engineered, Designed, Built, Developed, Implemented, Optimized, Enhanced, Led, Spearheaded, Automated, Deployed
❌ AVOID: "Responsible for", "Duties included", "Tasked with", "Worked on"

**Industry Context Examples:**
- Amazon → "for e-commerce recommendation system"
- Stripe → "for fintech payment platform"
- Salesforce → "for B2B SaaS customers"
- If unknown → use JD company's industry or default to "SaaS platform"


**Example Bullet (with domain keywords):**
"Architected **secure payment processing system** using **PCI-DSS compliant** infrastructure with Node.js 20, PostgreSQL, and Redis, implementing **fraud detection algorithms** and **tokenization** that processed $500M+ annually while reducing chargebacks by 40% and maintaining 99.99% uptime for 2M+ users."

---

## **🎯 ATS OPTIMIZATION CHECKLIST:**

**Keyword Usage:**
- Use EXACT phrases from JD (not synonyms)
- High-priority keywords appear 3-4x (Skills + Summary + 2-3 bullets)
- All required JD skills in Skills section
- All preferred JD skills in Skills section
- Technology versions match JD if specified

**Content Quality:**
- Natural, human-written flow (not robotic)
- Professional tone throughout
- Varied action verbs
- Strong metrics in every bullet
- Domain keywords integrated naturally

---

Return ONLY valid JSON: {"title":"...","summary":"...","skills":{"Category":["Skill1","Skill2"]},"experience":[{"title":"...","details":["bullet1","bullet2"]}]}
`;

    const aiResponse = await callAI(prompt, provider, model);

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

    // Prepare data for template
    const templateData = {
      name: profileData.name,
      title: resumeContent.title || "Senior Software Engineer",
      email: profileData.email,
      phone: null, // Excluded from resume
      location: profileData.location,
      linkedin: null, // Excluded from resume
      website: null, // Excluded from resume (may contain GitHub)
      summary: resumeContent.summary,
      skills: resumeContent.skills,
      experience: profileData.experience.map((job, idx) => ({
        title: job.title || resumeContent.experience[idx]?.title || "Engineer",
        company: job.company,
        location: job.location,
        start_date: job.start_date,
        end_date: job.end_date,
        details: resumeContent.experience[idx]?.details || []
      })),
      education: profileData.education
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

    // Generate filename from profile name + company name (if provided)
    const nameParts = profileData.name ? profileData.name.trim().split(/\s+/) : [];
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
