import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { AVAILABLE_MODELS } from "../lib/models";

export default function Home() {
  const [profiles, setProfiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("Resume");
  const [selectedProvider, setSelectedProvider] = useState("claude");
  const [selectedModel, setSelectedModel] = useState("");
  const [jd, setJd] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [disable, setDisable] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastGenerationTime, setLastGenerationTime] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [selectedProfileData, setSelectedProfileData] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [activeTab, setActiveTab] = useState("form");
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [jobApplicationInfo, setJobApplicationInfo] = useState({
    veteran: "No Veteran",
    ethnicity: "White",
    disability: "No Disability",
    clearance: "No",
    citizen: "Yes",
    sponsorship: "Not require",
    salaryRange: "100k - 140k yearly"
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Use models from ai-service.js
  const availableModels = AVAILABLE_MODELS;

  // Profile to Template mapping (fixed assignments)
  // Maps profile ID (filename without .json) to template ID
  const profileTemplateMap = {
    "James Davis": "Resume-Tech-Teal",
    "Luis Manriquez": "Resume-Creative-Burgundy",
    "Michael Smith": "Resume-Bold-Emerald",
    "Kareem Maize AI": "Resume-Modern-Green",
    "Vinay Matoori": "Resume-Corporate-Slate",
    "Olexandr Kutakh Verified": "Resume-Executive-Navy"
  };

  // Initialize model on mount and update when provider changes
  useEffect(() => {
    const models = availableModels[selectedProvider];
    if (models && models.length > 0) {
      setSelectedModel(models[0].id);
    }
  }, [selectedProvider]);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
  }, []);

  // Handle password submission
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === "asd") {
      setIsAuthenticated(true);
      setPasswordError("");
      setPassword("");
    } else {
      setPasswordError("Incorrect password. Please try again.");
      setPassword("");
    }
  };

  // Load profiles and templates on mount
  useEffect(() => {
    fetch("/api/profiles")
      .then(res => res.json())
      .then(data => setProfiles(data))
      .catch(err => console.error("Failed to load profiles:", err));

    fetch("/api/templates")
      .then(res => res.json())
      .then(data => setTemplates(data))
      .catch(err => console.error("Failed to load templates:", err));
  }, []);

  // Load profile data when profile is selected
  useEffect(() => {
    if (selectedProfile) {
      // Load profile data directly from the JSON file
      fetch(`/api/profiles/${selectedProfile}`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch profile");
          return res.json();
        })
        .then(data => setSelectedProfileData(data))
        .catch(err => {
          console.error("Failed to load profile data:", err);
          setSelectedProfileData(null);
        });

      // Auto-select template based on profile mapping
      if (profileTemplateMap[selectedProfile]) {
        const mappedTemplate = profileTemplateMap[selectedProfile];
        // Check if the template exists in the templates list
        const templateExists = templates.some(t => t.id === mappedTemplate);
        if (templateExists) {
          setSelectedTemplate(mappedTemplate);
        }
      }
    } else {
      setSelectedProfileData(null);
    }
  }, [selectedProfile, profiles, templates]);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Copy to clipboard function
  const copyToClipboard = async (text, fieldName) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      alert(`Failed to copy ${fieldName}`);
    }
  };

  // Preview template function
  const handlePreviewTemplate = (templateId) => {
    setSelectedTemplate(templateId);
    setPreviewTemplate(templateId);
    setPreviewLoading(true);
    // Switch to preview tab when previewing
    setActiveTab("preview");
  };

  // Initialize preview when template is selected in preview tab
  useEffect(() => {
    if (activeTab === "preview" && selectedTemplate && !previewTemplate) {
      setPreviewTemplate(selectedTemplate);
      setPreviewLoading(true);
    }
  }, [activeTab, selectedTemplate]);

  // Initialize preview when template is selected in preview tab
  useEffect(() => {
    if (activeTab === "preview" && selectedTemplate && !previewTemplate) {
      setPreviewTemplate(selectedTemplate);
      setPreviewLoading(true);
    }
  }, [activeTab, selectedTemplate]);

  // Extract information from profile data
  const getProfileInfo = () => {
    if (!selectedProfileData) return null;

    const location = selectedProfileData.location || "";
    // Get postal code directly from postalCode field
    const postalCode = selectedProfileData.postalCode || "";
    // Address is the location as-is
    const address = location;

    const lastExperience = selectedProfileData.experience && selectedProfileData.experience.length > 0
      ? selectedProfileData.experience[0]
      : null;

    // Try to find GitHub from various fields
    const github = selectedProfileData.github ||
      (selectedProfileData.website && selectedProfileData.website.includes("github")
        ? selectedProfileData.website
        : "");

    return {
      email: selectedProfileData.email || "",
      phone: selectedProfileData.phone || "",
      linkedin: selectedProfileData.linkedin || "",
      github: github,
      address: address,
      postalCode: postalCode,
      lastCompany: lastExperience?.company || "",
      lastRole: lastExperience?.title || ""
    };
  };

  // Calculate middle value of salary range
  const calculateSalaryMiddle = (salaryRange) => {
    if (!salaryRange) return null;

    // Extract numbers from range like "100k - 140k yearly" or "$100,000 - $140,000"
    const numbers = salaryRange.match(/(\d+(?:,\d{3})*)\s*k?/gi);
    if (!numbers || numbers.length < 2) return null;

    const min = parseFloat(numbers[0].replace(/,/g, '').replace(/k/gi, '')) * (numbers[0].toLowerCase().includes('k') ? 1000 : 1);
    const max = parseFloat(numbers[1].replace(/,/g, '').replace(/k/gi, '')) * (numbers[1].toLowerCase().includes('k') ? 1000 : 1);

    const middle = Math.round((min + max) / 2);
    return middle >= 1000 ? `$${(middle / 1000).toFixed(0)}k` : `$${middle.toLocaleString()}`;
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);


  // Theme colors - Natural, eye-friendly palette
  const themeColors = {
    dark: {
      bg: "#1a1d24",
      cardBg: "rgba(30, 33, 40, 0.8)",
      cardBorder: "rgba(255, 255, 255, 0.08)",
      text: "#e4e7eb",
      textSecondary: "#b0b5bb",
      textMuted: "#8a8f95",
      inputBg: "rgba(40, 43, 50, 0.6)",
      inputBorder: "rgba(255, 255, 255, 0.12)",
      textareaBg: "rgba(35, 38, 45, 0.7)",
      buttonBg: "#4a90e2",
      buttonText: "#ffffff",
      buttonDisabled: "rgba(100, 100, 100, 0.3)",
      successBg: "rgba(74, 144, 226, 0.15)",
      successText: "#6ba3e8",
      scrollbarTrack: "#252830",
      scrollbarThumb: "#4a4f5a",
      scrollbarThumbHover: "#5a5f6a",
      selection: "rgba(74, 144, 226, 0.25)"
    },
    light: {
      bg: "#f5f6f8",
      cardBg: "rgba(255, 255, 255, 0.95)",
      cardBorder: "rgba(0, 0, 0, 0.1)",
      text: "#2c3e50",
      textSecondary: "#5a6c7d",
      textMuted: "#7f8c9a",
      inputBg: "rgba(250, 251, 252, 0.9)",
      inputBorder: "rgba(0, 0, 0, 0.12)",
      textareaBg: "rgba(255, 255, 255, 0.95)",
      buttonBg: "#4a90e2",
      buttonText: "#ffffff",
      buttonDisabled: "rgba(180, 180, 180, 0.4)",
      successBg: "rgba(74, 144, 226, 0.12)",
      successText: "#3a7bc8",
      scrollbarTrack: "#e8eaed",
      scrollbarThumb: "#c1c7cd",
      scrollbarThumbHover: "#a8b0b8",
      selection: "rgba(74, 144, 226, 0.2)"
    }
  };

  const colors = themeColors[theme];

  const generatePDF = async () => {
    if (disable) return;
    if (!selectedProfile) return alert("Please select a profile");
    if (!jd) return alert("Please enter the Job Description");

    setDisable(true);
    setElapsedTime(0);
    setLastGenerationTime(null); // Clear previous time when starting new generation

    // Start timer
    startTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
      setElapsedTime(parseFloat(elapsed));
    }, 100);

    try {
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: selectedProfile,
          jd: jd,
          template: selectedTemplate,
          provider: selectedProvider,
          model: selectedModel,
          companyName: companyName.trim() || null
        })
      });

      if (!genRes.ok) {
        const errorText = await genRes.text();
        console.error('Error response:', errorText);

        throw new Error(errorText || "Failed to generate PDF");
      }

      const blob = await genRes.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Generate filename from profile name + company name (if provided)
      const profile = profiles.find(p => p.id === selectedProfile);
      const profileName = profile ? profile.name : "Profile";
      const nameParts = profileName.trim().split(/\s+/);
      let baseName;
      if (nameParts.length === 1) baseName = nameParts[0];
      else baseName = `${nameParts[0]}_${nameParts[nameParts.length - 1]}`;
      // Sanitize: remove unsafe chars and collapse whitespace
      baseName = baseName.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");

      // Append company name if provided
      if (companyName && companyName.trim()) {
        const sanitizedCompanyName = companyName.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");
        baseName = `${baseName}_${sanitizedCompanyName}`;
      }

      const fileName = `${baseName}.pdf`;
      a.download = fileName;

      a.click();
      window.URL.revokeObjectURL(url);

      // alert("✅ Resume generated successfully!");
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      // Stop timer and save final generation time
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      // Calculate and save the final elapsed time
      if (startTimeRef.current) {
        const finalTime = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
        setLastGenerationTime(parseFloat(finalTime));
        startTimeRef.current = null;
      }
      setDisable(false);
    }
  };

  return (
    <>
      <Head>
        <title>Resume Tailor - AI-Powered Resume Optimization</title>
        <meta name="description" content="AI-powered resume optimization tool. Tailor your resume to match job descriptions perfectly." />
        <link
          rel="icon"
          href={`data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="6" fill="#22d3ee"/>
              <rect x="6" y="8" width="14" height="18" rx="1.5" fill="#0a0f1c"/>
              <path d="M6 8L12 8L6 14V8Z" fill="#0a0f1c" opacity="0.7"/>
              <line x1="9" y1="18" x2="17" y2="18" stroke="#22d3ee" stroke-width="1.2" stroke-linecap="round"/>
              <line x1="9" y1="21" x2="16" y2="21" stroke="#22d3ee" stroke-width="1.2" stroke-linecap="round"/>
              <line x1="9" y1="24" x2="17" y2="24" stroke="#22d3ee" stroke-width="1.2" stroke-linecap="round"/>
              <g transform="translate(20, 10)">
                <line x1="2" y1="0" x2="2" y2="8" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="2" cy="3" r="1" fill="#0a0f1c"/>
                <path d="M2 0 Q4 2 6 0" stroke="#10b981" stroke-width="1.2" fill="none" stroke-linecap="round"/>
              </g>
            </svg>
          `)}`}
        />
      </Head>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 16px;
          background: ${colors.bg};
          min-height: 100vh;
          transition: background 0.2s ease;
        }
        
        ::selection {
          background: ${colors.selection};
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: ${colors.scrollbarTrack};
        }
        ::-webkit-scrollbar-thumb {
          background: ${colors.scrollbarThumb};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${colors.scrollbarThumbHover};
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: colors.bg,
        position: "relative",
        transition: "background 0.2s ease"
      }}>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            border: `1px solid ${colors.inputBorder}`,
            background: colors.inputBg,
            color: colors.text,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            zIndex: 100,
            transition: "all 0.2s ease"
          }}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {!isAuthenticated ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "32px 20px"
          }}>
            <div style={{
              maxWidth: "400px",
              width: "100%",
              background: colors.cardBg,
              borderRadius: "12px",
              border: `1px solid ${colors.cardBorder}`,
              padding: "32px",
              transition: "all 0.2s ease"
            }}>
              <h2 style={{
                fontSize: "28px",
                fontWeight: "500",
                color: colors.text,
                marginBottom: "8px",
                textAlign: "center"
              }}>
                Password Required
              </h2>
              <p style={{
                fontSize: "16px",
                color: colors.textMuted,
                marginBottom: "24px",
                textAlign: "center"
              }}>
                Please enter the password to access this page.
              </p>
              <form onSubmit={handlePasswordSubmit}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "15px",
                    fontWeight: "400",
                    color: colors.textSecondary,
                    marginBottom: "4px"
                  }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError("");
                    }}
                    placeholder="Enter password..."
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: "16px",
                      fontFamily: "inherit",
                      color: colors.text,
                      background: colors.inputBg,
                      border: `1px solid ${passwordError ? "#ef4444" : colors.inputBorder}`,
                      borderRadius: "8px",
                      outline: "none",
                      transition: "all 0.2s ease"
                    }}
                    autoFocus
                  />
                  {passwordError && (
                    <div style={{
                      fontSize: "15px",
                      color: "#ef4444",
                      marginTop: "6px"
                    }}>
                      {passwordError}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "18px",
                    fontWeight: "400",
                    fontFamily: "inherit",
                    color: colors.buttonText,
                    background: colors.buttonBg,
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  Access
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "32px 20px"
          }}>
            <div style={{
              maxWidth: "600px",
              width: "100%",
              background: colors.cardBg,
              borderRadius: "12px",
              border: `1px solid ${colors.cardBorder}`,
              padding: "28px",
              transition: "all 0.2s ease"
            }}>

              {/* Tab Navigation */}
              <div style={{
                display: "flex",
                gap: "8px",
                marginBottom: "24px",
                borderBottom: `1px solid ${colors.inputBorder}`
              }}>
                <button
                  onClick={() => setActiveTab("form")}
                  style={{
                    padding: "10px 16px",
                    fontSize: "16px",
                    fontWeight: activeTab === "form" ? "500" : "400",
                    color: activeTab === "form" ? colors.text : colors.textMuted,
                    background: "transparent",
                    border: "none",
                    borderBottom: activeTab === "form" ? `2px solid ${colors.buttonBg}` : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    marginBottom: "-1px"
                  }}
                >
                  Generate Resume
                </button>
                <button
                  onClick={() => setActiveTab("info")}
                  style={{
                    padding: "10px 16px",
                    fontSize: "16px",
                    fontWeight: activeTab === "info" ? "500" : "400",
                    color: activeTab === "info" ? colors.text : colors.textMuted,
                    background: "transparent",
                    border: "none",
                    borderBottom: activeTab === "info" ? `2px solid ${colors.buttonBg}` : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    marginBottom: "-1px"
                  }}
                >
                  Required Information
                </button>
                <button
                  onClick={() => setActiveTab("preview")}
                  style={{
                    padding: "10px 16px",
                    fontSize: "16px",
                    fontWeight: activeTab === "preview" ? "500" : "400",
                    color: activeTab === "preview" ? colors.text : colors.textMuted,
                    background: "transparent",
                    border: "none",
                    borderBottom: activeTab === "preview" ? `2px solid ${colors.buttonBg}` : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    marginBottom: "-1px"
                  }}
                >
                  Template Preview
                </button>
              </div>

              {/* Form Tab */}
              {activeTab === "form" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                  {/* Profile & Template Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{
                        display: "block",
                        fontSize: "15px",
                        fontWeight: "400",
                        color: colors.textSecondary,
                        marginBottom: "4px"
                      }}>
                        Profile
                      </label>
                      <select
                        value={selectedProfile}
                        onChange={(e) => setSelectedProfile(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          fontSize: "16px",
                          fontFamily: "inherit",
                          color: selectedProfile ? colors.text : colors.textMuted,
                          background: colors.inputBg,
                          border: `1px solid ${colors.inputBorder}`,
                          borderRadius: "8px",
                          outline: "none",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <option value="">Select...</option>
                        {profiles.map(profile => (
                          <option key={profile.id} value={profile.id} style={{ background: theme === "dark" ? "#1e293b" : "#ffffff", color: colors.text }}>
                            {profile.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: "block",
                        fontSize: "15px",
                        fontWeight: "400",
                        color: colors.textSecondary,
                        marginBottom: "4px"
                      }}>
                        Template
                      </label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          fontSize: "16px",
                          fontFamily: "inherit",
                          color: colors.text,
                          background: colors.inputBg,
                          border: `1px solid ${colors.inputBorder}`,
                          borderRadius: "8px",
                          outline: "none",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {templates.map(template => (
                          <option key={template.id} value={template.id} style={{ background: theme === "dark" ? "#1e293b" : "#ffffff", color: colors.text }}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quick Info Section */}
                  {selectedProfileData && getProfileInfo() && (
                    <div style={{
                      padding: "12px",
                      background: colors.inputBg,
                      borderRadius: "8px",
                      border: `1px solid ${colors.inputBorder}`
                    }}>
                      <div style={{
                        fontSize: "15px",
                        fontWeight: "400",
                        color: colors.textSecondary,
                        marginBottom: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                        Quick Info
                      </div>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "8px"
                      }}>
                        {[
                          { key: "email", label: "Email", value: getProfileInfo().email },
                          { key: "phone", label: "Phone", value: getProfileInfo().phone },
                          { key: "linkedin", label: "LinkedIn", value: getProfileInfo().linkedin },
                          { key: "github", label: "GitHub", value: getProfileInfo().github },
                          { key: "address", label: "Address", value: getProfileInfo().address },
                          { key: "postalCode", label: "Postal Code", value: getProfileInfo().postalCode },
                          { key: "lastCompany", label: "Last Company", value: getProfileInfo().lastCompany },
                          { key: "lastRole", label: "Last Role", value: getProfileInfo().lastRole }
                        ].map(({ key, label, value }) => (
                          value ? (
                            <button
                              key={key}
                              onClick={() => copyToClipboard(value, key)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "8px 10px",
                                background: copiedField === key ? colors.successBg : "transparent",
                                border: `1px solid ${copiedField === key ? colors.successText : colors.inputBorder}`,
                                borderRadius: "6px",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                textAlign: "center"
                              }}
                              title={`Click to copy ${label}`}
                            >
                              <div style={{
                                fontSize: "16px",
                                color: copiedField === key ? colors.successText : colors.text,
                                fontWeight: "400"
                              }}>
                                {label}
                              </div>
                              {copiedField === key && (
                                <div style={{
                                  marginLeft: "6px",
                                  fontSize: "16px",
                                  color: colors.successText,
                                  flexShrink: 0
                                }}>
                                  ✓
                                </div>
                              )}
                            </button>
                          ) : null
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Job Description */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "15px",
                      fontWeight: "400",
                      color: colors.textSecondary,
                      marginBottom: "4px"
                    }}>
                      Job Description
                    </label>
                    <textarea
                      value={jd}
                      onChange={(e) => setJd(e.target.value)}
                      placeholder="Paste job description..."
                      rows="8"
                      style={{
                        width: "100%",
                        padding: "12px",
                        fontSize: "16px",
                        fontFamily: "inherit",
                        color: colors.text,
                        background: colors.textareaBg,
                        border: `1px solid ${colors.inputBorder}`,
                        borderRadius: "8px",
                        outline: "none",
                        resize: "vertical",
                        minHeight: "140px",
                        lineHeight: "1.5",
                        transition: "all 0.2s ease"
                      }}
                    />
                  </div>

                  {/* Company Name */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "15px",
                      fontWeight: "400",
                      color: colors.textSecondary,
                      marginBottom: "4px"
                    }}>
                      Company Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter company name for filename..."
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: "16px",
                        fontFamily: "inherit",
                        color: colors.text,
                        background: colors.inputBg,
                        border: `1px solid ${colors.inputBorder}`,
                        borderRadius: "8px",
                        outline: "none",
                        transition: "all 0.2s ease"
                      }}
                    />
                    <div style={{
                      fontSize: "14px",
                      color: colors.textMuted,
                      marginTop: "4px"
                    }}>
                      {(() => {
                        const profileName = selectedProfileData?.name || "resume";
                        const nameParts = profileName.trim().split(/\s+/);
                        let previewName = nameParts.length === 1
                          ? nameParts[0]
                          : `${nameParts[0]}_${nameParts[nameParts.length - 1]}`;
                        previewName = previewName.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");

                        if (companyName.trim()) {
                          const sanitizedCompany = companyName.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");
                          previewName = `${previewName}_${sanitizedCompany}`;
                        }
                        return `Will save as: ${previewName}.pdf`;
                      })()}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={generatePDF}
                    disabled={disable}
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: "18px",
                      fontWeight: "400",
                      fontFamily: "inherit",
                      color: disable ? colors.textMuted : colors.buttonText,
                      background: disable
                        ? colors.buttonDisabled
                        : colors.buttonBg,
                      border: "none",
                      borderRadius: "8px",
                      cursor: disable ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {disable ? (
                      `Generating... ${elapsedTime > 0 ? `(${elapsedTime.toFixed(1)}s)` : ''}`
                    ) : (
                      "Generate Resume"
                    )}
                  </button>

                  {/* Generation Time Display */}
                  {lastGenerationTime !== null && !disable && (
                    <div style={{
                      marginTop: "8px",
                      padding: "8px",
                      background: colors.successBg,
                      borderRadius: "6px",
                      textAlign: "center",
                      fontSize: "15px",
                      color: colors.successText,
                      transition: "all 0.2s ease"
                    }}>
                      Generated in {lastGenerationTime.toFixed(1)}s
                    </div>
                  )}
                </div>
              )}

              {/* Preview Tab */}
              {activeTab === "preview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px", minHeight: "60vh" }}>
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "15px",
                      fontWeight: "400",
                      color: colors.textSecondary,
                      marginBottom: "8px"
                    }}>
                      Select Template to Preview
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => {
                        setSelectedTemplate(e.target.value);
                        setPreviewTemplate(e.target.value);
                        setPreviewLoading(true);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: "16px",
                        fontFamily: "inherit",
                        color: colors.text,
                        background: colors.inputBg,
                        border: `1px solid ${colors.inputBorder}`,
                        borderRadius: "8px",
                        outline: "none",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {templates.map(template => (
                        <option key={template.id} value={template.id} style={{ background: theme === "dark" ? "#1e293b" : "#ffffff", color: colors.text }}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{
                    flex: 1,
                    overflow: "hidden",
                    padding: "12px",
                    background: "#f5f5f5",
                    borderRadius: "8px",
                    border: `1px solid ${colors.inputBorder}`,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "50vh"
                  }}>
                    {previewLoading && (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "40px",
                        color: colors.textMuted
                      }}>
                        Generating PDF preview...
                      </div>
                    )}
                    {selectedTemplate && (
                      <>
                        <div style={{
                          display: "flex",
                          gap: "8px",
                          marginBottom: "8px",
                          flexShrink: 0
                        }}>
                          <a
                            href={`/api/preview?template=${selectedTemplate}&t=${Date.now()}`}
                            download={`preview-${selectedTemplate}.pdf`}
                            style={{
                              padding: "8px 16px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              color: colors.buttonText,
                              background: colors.buttonBg,
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              textDecoration: "none",
                              transition: "all 0.2s ease"
                            }}
                            onClick={() => setPreviewLoading(false)}
                          >
                            📥 Download PDF
                          </a>
                          <a
                            href={`/api/preview?template=${selectedTemplate}&t=${Date.now()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: "8px 16px",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              color: colors.buttonText,
                              background: colors.inputBg,
                              border: `1px solid ${colors.inputBorder}`,
                              borderRadius: "6px",
                              cursor: "pointer",
                              textDecoration: "none",
                              transition: "all 0.2s ease"
                            }}
                            onClick={() => setPreviewLoading(false)}
                          >
                            🔗 Open in New Tab
                          </a>
                        </div>
                        <div style={{
                          flex: 1,
                          overflow: "auto",
                          background: "white",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                          minHeight: 0
                        }}>
                          <object
                            data={`/api/preview?template=${selectedTemplate}&t=${Date.now()}`}
                            type="application/pdf"
                            style={{
                              width: "100%",
                              height: "100%",
                              minHeight: "50vh",
                              border: "none",
                              display: "block"
                            }}
                            onLoad={() => setPreviewLoading(false)}
                            title="Template Preview PDF"
                          >
                            <p style={{
                              padding: "20px",
                              textAlign: "center",
                              color: colors.textMuted
                            }}>
                              Your browser does not support PDFs.
                              <a
                                href={`/api/preview?template=${selectedTemplate}&t=${Date.now()}`}
                                download={`preview-${selectedTemplate}.pdf`}
                                style={{ color: colors.buttonBg, marginLeft: "8px" }}
                              >
                                Click here to download the PDF
                              </a>
                            </p>
                          </object>
                        </div>
                      </>
                    )}
                    {!selectedTemplate && (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "40px",
                        color: colors.textMuted,
                        textAlign: "center"
                      }}>
                        Please select a template to preview
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Information Tab */}
              {activeTab === "info" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* Job Application Information */}
                      <div style={{
                        padding: "16px",
                        background: colors.inputBg,
                        borderRadius: "8px",
                        border: `1px solid ${colors.inputBorder}`
                      }}>
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, 1fr)",
                          gap: "12px"
                        }}>
                          <div>
                            <div style={{
                              fontSize: "18px",
                              color: colors.textMuted,
                              marginBottom: "4px"
                            }}>
                              Veteran
                            </div>
                            <div style={{
                              fontSize: "16px",
                              color: colors.text,
                              fontWeight: "400"
                            }}>
                              {jobApplicationInfo.veteran}
                            </div>
                          </div>
                          <div>
                            <div style={{
                              fontSize: "18px",
                              color: colors.textMuted,
                              marginBottom: "4px"
                            }}>
                              Ethnicity
                            </div>
                            <div style={{
                              fontSize: "16px",
                              color: colors.text,
                              fontWeight: "400"
                            }}>
                              {jobApplicationInfo.ethnicity}
                            </div>
                          </div>
                          <div>
                            <div style={{
                              fontSize: "18px",
                              color: colors.textMuted,
                              marginBottom: "4px"
                            }}>
                              Disability
                            </div>
                            <div style={{
                              fontSize: "16px",
                              color: colors.text,
                              fontWeight: "400"
                            }}>
                              {jobApplicationInfo.disability}
                            </div>
                          </div>
                          <div>
                            <div style={{
                              fontSize: "18px",
                              color: colors.textMuted,
                              marginBottom: "4px"
                            }}>
                              Clearance
                            </div>
                            <div style={{
                              fontSize: "16px",
                              color: colors.text,
                              fontWeight: "400"
                            }}>
                              {jobApplicationInfo.clearance}
                            </div>
                          </div>
                          <div>
                            <div style={{
                              fontSize: "18px",
                              color: colors.textMuted,
                              marginBottom: "4px"
                            }}>
                              Citizen
                            </div>
                            <div style={{
                              fontSize: "16px",
                              color: colors.text,
                              fontWeight: "400"
                            }}>
                              {jobApplicationInfo.citizen}
                            </div>
                          </div>
                          <div>
                            <div style={{
                              fontSize: "18px",
                              color: colors.textMuted,
                              marginBottom: "4px"
                            }}>
                              Sponsorship
                            </div>
                            <div style={{
                              fontSize: "16px",
                              color: colors.text,
                              fontWeight: "400"
                            }}>
                              {jobApplicationInfo.sponsorship}
                            </div>
                          </div>
                          <div style={{ gridColumn: "span 2" }}>
                            <div style={{
                              fontSize: "18px",
                              color: colors.textMuted,
                              marginBottom: "4px"
                            }}>
                              Salary Range
                            </div>
                            <div style={{
                              fontSize: "16px",
                              color: colors.text,
                              fontWeight: "400",
                              marginBottom: "4px"
                            }}>
                              {jobApplicationInfo.salaryRange}
                            </div>
                            {jobApplicationInfo.salaryRange && calculateSalaryMiddle(jobApplicationInfo.salaryRange) && (
                              <div style={{
                                fontSize: "15px",
                                color: colors.successText,
                                fontStyle: "italic"
                              }}>
                                Middle value: {calculateSalaryMiddle(jobApplicationInfo.salaryRange)} yearly
                              </div>
                            )}
                            <div style={{
                              fontSize: "15px",
                              color: colors.textMuted,
                              lineHeight: "1.5",
                              marginTop: "12px",
                              padding: "10px",
                              background: colors.inputBg,
                              borderRadius: "6px",
                              border: `1px solid ${colors.inputBorder}`
                            }}>
                              <strong style={{ color: colors.textSecondary }}>Salary Selection:</strong> If the salary range is given in the Job description, please select the middle value.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

    </>
  );
}
