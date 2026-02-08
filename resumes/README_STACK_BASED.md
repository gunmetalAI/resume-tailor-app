# Stack-Based Resume Files Guide

## Overview
This directory contains stack-specific basic resume files that serve as the foundation for AI-powered resume tailoring. Each person has multiple resume files, one for each technology stack.

## File Naming Convention

**Format:** `{Person Name} {Stack Name}.json`

### Available Stack Names:
- `Node` - Node.js/JavaScript stack
- `Python` - Python stack
- `Java` - Java stack
- `Golang` - Go/Golang stack
- `C#.NET` - C#/.NET stack (note: use "C#.NET" in filename)
- `AI` - AI/ML/Data stack
- `Mobile` - Mobile development stack
- `Other` - Other/General stack

### Examples:
- `Anatoliy Sokolov Node.json`
- `Anatoliy Sokolov Python.json`
- `Anatoliy Sokolov Java.json`
- `Anatoliy Sokolov Golang.json`
- `Anatoliy Sokolov C#.NET.json`
- `Anatoliy Sokolov AI.json`
- `Anatoliy Sokolov Mobile.json`
- `Anatoliy Sokolov Other.json`

## JSON Structure Requirements

### Required Fields:
```json
{
  "name": "Full Name",
  "email": "email@example.com",
  "location": "City, State",
  "experience": [...],
  "education": [...]
}
```

### Summary (Recommended):
- `summary` (string) - A 3–6 line professional summary for this stack file.
  - Example: *"Senior Full Stack Engineer with 10+ years of experience designing and delivering scalable, high-performance web and mobile applications..."*

### Skills Section (Required):
Top-level skills field that supports two formats:

**Format 1: Categorized (Object)**
```json
"skills": {
  "Frontend": ["React.js", "TypeScript", "Angular", "Vue.js"],
  "Backend & Database": ["Node.js", "Python", "PostgreSQL", "MongoDB"],
  "Cloud & DevOps": ["AWS", "Docker", "Kubernetes", "CI/CD"]
}
```

**Format 2: Flat List (String or Array)**
```json
"skills": "React.js | TypeScript | Node.js | Python | PostgreSQL | AWS | Docker"
```
or
```json
"skills": ["React.js", "TypeScript", "Node.js", "Python", "PostgreSQL", "AWS", "Docker"]
```

### Experience Array (Required):
Each experience entry must include:
- `company` (string) - Company name
- `title` (string) - Job title specific to this stack
- `location` (string) - Job location (format: "City, State")
- `start_date` (string) - Start date (format: "Jan 2020", "Feb 2020", or "2014")
- `end_date` (string) - End date (format: "Present" or "Dec 2019" or "2015")
- `bullets` (array, **RECOMMENDED**) - **CRITICAL**: Detailed bullet points describing achievements and responsibilities for this role

**Note:** Skills are provided at the top level, not per experience entry.

**Important:** The top-level `skills` field should contain technologies relevant to the specific stack. For example:
- **Node.json**: Emphasize Node.js, Express.js, TypeScript, React, etc.
- **Python.json**: Emphasize Python, Django, Flask, FastAPI, etc.
- **Java.json**: Emphasize Java, Spring Boot, Maven, etc.
- **Golang.json**: Emphasize Go, Golang, Gin, etc.
- **C#.NET.json**: Emphasize C#, .NET, ASP.NET, SQL Server, etc.

### Education Array (Required):
- `degree` (string) - Degree name (e.g., "Master's Degree in Computer Science", "Bachelor of Science in Computer Science")
- `school` (string) - School name
- `start_year` (string) - Start year (can be empty string or omitted)
- `end_year` (string) - End year
- `grade` (string, optional) - GPA or grade (omit if not available)

### Optional Fields:
- `phone` (string)
- `postalCode` (string) - Optional, can be omitted if using "City, State" format
- `linkedin` (string)
- `website` (string)
- `github` (string)

## How It Works

1. **Step 1**: AI analyzes the job description to determine technology category and required tech stacks
2. **Step 2**: System selects the appropriate stack-based resume file based on:
   - Category: "Mobile" → `Mobile.json`, "AI/ML/Data" → `AI.json`, "QA/Automation/Testing" → `QA.json`, "Other" → `Other.json`
   - For "Web" category: Checks tech stacks for Go/Java/C#/Python/Node
3. **Step 3**: The selected basic resume is sent to AI along with the job description for tailoring

## Creating Stack-Based Resume Files

### Step-by-Step Process:

1. **Use the Template**: Copy `_template_stack_based.json` as your starting point

2. **For Each Person**: Create one file per stack
   ```
   Anatoliy Sokolov Node.json
   Anatoliy Sokolov Python.json
   Anatoliy Sokolov Java.json
   ... (one for each stack)
   ```

3. **Fill in the Data**:
   - Use the SAME personal information (name, email, location) across all stack files
   - Use the SAME experience entries (same companies, dates) across all stack files
   - **BUT** customize:
     - Top-level `skills` field - include only skills relevant to that stack (categorized or flat format)
     - `title` field in each experience - make it stack-relevant
     - `bullets` array in each experience - tailor the bullet points to emphasize stack-relevant technologies and achievements

4. **Example - Same Experience, Different Stack Emphasis**:
   
   **Node.json**:
   ```json
   {
     "skills": {
       "Frontend": ["React.js", "TypeScript", "Next.js", "Redux"],
       "Backend": ["Node.js", "Express.js", "NestJS", "RESTful APIs", "GraphQL"],
       "Database": ["PostgreSQL", "MongoDB", "Redis"]
     },
     "experience": [
       {
         "company": "VC3",
         "title": "Senior Full Stack Engineer",
         "location": "Nazareth, PA",
         "start_date": "Feb 2020",
         "end_date": "Present",
         "bullets": [
           "Architected and delivered complex full-stack systems using React, TypeScript, Node.js, and Express, applying modern patterns such as modular monorepos and scalable state management.",
           "Built high-performance backend services using Node.js and Express.js, implementing RESTful APIs, background workers, and asynchronous processing pipelines.",
           "Designed robust data access layers integrating PostgreSQL, handling transactional consistency, migrations, and query optimization."
         ]
       }
     ]
   }
   ```
   
   **Python.json**:
   ```json
   {
     "skills": {
       "Backend": ["Python", "Django", "FastAPI", "Flask", "RESTful APIs"],
       "Database": ["PostgreSQL", "MongoDB", "Redis"],
       "AI/ML": ["TensorFlow", "PyTorch", "scikit-learn", "OpenAI API", "LangChain"]
     },
     "experience": [
       {
         "company": "VC3",
         "title": "Senior Backend Engineer",
         "location": "Nazareth, PA",
         "start_date": "Feb 2020",
         "end_date": "Present",
         "bullets": [
           "Built high-performance backend services using FastAPI, Django, and Flask, implementing RESTful APIs, background workers, and asynchronous processing pipelines.",
           "Designed robust data access layers integrating PostgreSQL and MongoDB, handling transactional consistency, migrations, and query optimization.",
           "Integrated LLM-based AI capabilities into production systems using Python frameworks, including prompt engineering and secure API consumption."
         ]
       }
     ]
   }
   ```

## Important Notes

1. **Top-Level Skills**: Skills are provided at the top level of the JSON, not per experience entry. You can use either:
   - **Categorized format**: Object with category names as keys (e.g., "Frontend:", "Backend & Database:")
   - **Flat format**: Single string with " | " separators, or an array of strings

2. **Bullets Array is Critical**: The `bullets` array in each experience entry contains detailed descriptions of achievements and responsibilities. These should be tailored per stack to emphasize relevant technologies and accomplishments. The AI will use these as the foundation when tailoring for specific job descriptions.

3. **Skills Should Match Stack**: The top-level `skills` field should contain technologies relevant to the specific stack. Include all technologies mentioned in the bullets.

4. **Titles Can Vary**: Job titles can be slightly different per stack to match the emphasis (e.g., "Full Stack Engineer" vs "Backend Engineer" vs "Frontend Engineer").

5. **Companies Stay the Same**: All stack files for the same person should have the same companies and date ranges - only top-level skills, titles, and bullet content change.

5. **Location Format**: Use "City, State" format (e.g., "Nazareth, PA"). No postal code needed.

6. **Education Grade**: The `grade` field is optional. Omit it entirely if not available - do not set it to empty string.

4. **Special Characters**: For C#/.NET, use `C#.NET` in the filename (the code handles this automatically).

5. **Validation**: Before using, ensure:
   - All required fields are present
   - Date formats are consistent
   - Skills arrays contain relevant technologies
   - JSON is valid (no trailing commas, proper escaping)

## Template File Location

Use `_template_stack_based.json` as a starting template for creating new stack-based resume files.
