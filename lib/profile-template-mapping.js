// Profile to Template mapping
// Maps profile ID (filename without .json) to template ID
// Note: All profiles now use the single tailoring-guide.txt file
export const profileTemplateMapping = {
    "aaronallen": {
        resume: "Aaron Allen",
        template: "Resume-Bold-Emerald"
    },
    "brandontrumble": {
        resume: "Brandon Trumble",
        template: "Resume-Consultant-Steel"
    },
    "juanruiz": {
        resume: "Juan Ruiz",
        template: "Resume-Tech-Teal"
    },
    "nathankamenar": {
        resume: "Nathan Kamenar",
        template: "Resume-Executive-Navy"
    },
    "venuyara": {
        resume: "Venugopal Yara",
        template: "Resume-Academic-Purple"
    }
};

/**
 * Get profile configuration by slug (numeric ID)
 * @param {string} slug - The numeric ID slug (e.g., "1", "2", "3")
 * @returns {object|null} - Profile configuration or null if not found
 */
export const getProfileBySlug = (slug) => {
    if (!slug) return null;
    return profileTemplateMapping[slug] || null;
};

/**
 * Get resume name (profile name) by slug
 * @param {string} slug - The numeric ID slug (e.g., "1", "2", "3")
 * @returns {string|null} - Resume name or null if not found
 */
export const slugToProfileName = (slug) => {
    const config = getProfileBySlug(slug);
    return config?.resume || null;
};

/**
 * Get template for a profile by slug
 * @param {string} slug - The numeric ID slug (e.g., "1", "2", "3")
 * @returns {string} - Template ID or "Resume" as default
 */
export const getTemplateForProfile = (slug) => {
    const config = getProfileBySlug(slug);
    return config?.template || "Resume";
};

/**
 * Get prompt file name for a profile by slug
 * @deprecated All profiles now use the single tailoring-guide.txt file
 * @param {string} slug - The numeric ID slug (e.g., "1", "2", "3")
 * @returns {string} - Always returns "tailoring-guide" (for backward compatibility)
 */
export const getPromptForProfile = (slug) => {
    // All profiles now use the single tailoring guide
    return "tailoring-guide";
};

/**
 * Get all available slug values (numeric IDs from mapping)
 * @returns {string[]} - Array of available slugs (numeric IDs)
 */
export const getAvailableSlugs = () => {
    return Object.keys(profileTemplateMapping);
};

/**
 * Get profile configuration by profile ID (numeric key)
 * @param {string} profileId - The numeric profile ID
 * @returns {object|null} - Profile configuration or null if not found
 */
export const getProfileById = (profileId) => {
    return profileTemplateMapping[profileId] || null;
};

export default profileTemplateMapping;

