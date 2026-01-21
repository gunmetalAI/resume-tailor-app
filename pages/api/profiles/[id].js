import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Profile ID required" });
    }

    // Try multiple possible paths: root level and subdirectory
    const possibleProfilePaths = [
      path.join(process.cwd(), "resumes", `${id}.json`),
      path.join(process.cwd(), "resumes", id, `${id}.json`)
    ];
    
    let profilePath = null;
    for (const testPath of possibleProfilePaths) {
      if (fs.existsSync(testPath)) {
        profilePath = testPath;
        break;
      }
    }

    if (!profilePath) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profileData = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
    res.status(200).json(profileData);
  } catch (error) {
    console.error("Error reading profile:", error);
    res.status(500).json({ error: "Failed to load profile" });
  }
}
