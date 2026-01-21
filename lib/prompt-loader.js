import fs from 'fs';
import path from 'path';

/**
 * Load the tailoring guide (single file for all profiles)
 * @returns {string} - Tailoring guide content
 */
export const loadTailoringGuide = () => {
  try {
    const tailoringGuidePath = path.join(process.cwd(), 'lib', 'prompts', 'tailoring-guide.txt');
    
    if (!fs.existsSync(tailoringGuidePath)) {
      throw new Error('Tailoring guide file not found: tailoring-guide.txt');
    }

    return fs.readFileSync(tailoringGuidePath, 'utf-8');
  } catch (error) {
    console.error('Error loading tailoring guide:', error);
    throw error;
  }
};

// Legacy function for backward compatibility (now just loads tailoring guide)
export const loadPromptForProfile = () => {
  return loadTailoringGuide();
};

export default { loadTailoringGuide, loadPromptForProfile };

