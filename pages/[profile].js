import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { slugToProfileName } from "../lib/profile-template-mapping";

// Lazy load components for better performance
const LoadingSpinner = lazy(() => Promise.resolve({
  default: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(74, 144, 226, 0.3)',
        borderTop: '3px solid #4a90e2',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
    </div>
  )
}));

export default function ProfilePage() {
  const router = useRouter();
  const { profile: profileSlug } = router.query;

  const [jd, setJd] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [disable, setDisable] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastGenerationTime, setLastGenerationTime] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [selectedProfileData, setSelectedProfileData] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);
  const [preparedPrompt, setPreparedPrompt] = useState(null);
  const [gptResponse, setGptResponse] = useState("");
  const [preparingPrompt, setPreparingPrompt] = useState(false);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
  }, []);

  // Lazy load profile data when profile slug changes
  useEffect(() => {
    if (!profileSlug) return;

    setLoading(true);
    const profileNameFromSlug = slugToProfileName(profileSlug);

    if (!profileNameFromSlug) {
      console.error(`Profile not found for slug: ${profileSlug}`);
      router.push('/');
      return;
    }

    setProfileName(profileNameFromSlug);

    // Lazy load profile data with delay to show loading state
    const loadData = async () => {
      try {
        const response = await fetch(`/api/profiles/${encodeURIComponent(profileNameFromSlug)}`);
        if (!response.ok) {
          if (response.status === 404) {
            console.error(`Profile file not found: ${profileNameFromSlug}`);
            router.push('/');
            return;
          }
          throw new Error(`Failed to fetch profile: ${response.statusText}`);
        }
        const data = await response.json();
        setSelectedProfileData(data);
      } catch (err) {
        console.error("Failed to load profile data:", err);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    // Small delay for better UX (allows loading state to show)
    const timer = setTimeout(loadData, 100);
    return () => clearTimeout(timer);
  }, [profileSlug, router]);

  // Copy to clipboard function
  const copyToClipboard = async (text, fieldName) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Get last company and role
  const getLastCompany = () => {
    return selectedProfileData?.experience?.[0]?.company || null;
  };

  const getLastRole = () => {
    return selectedProfileData?.experience?.[0]?.title || null;
  };

  // Prepare prompt for GPT
  const handlePreparePrompt = async () => {
    if (!jd.trim()) {
      alert("Please enter a job description");
      return;
    }

    if (!selectedProfileData || !profileSlug) {
      alert("Profile data not loaded");
      return;
    }

    setPreparingPrompt(true);
    try {
      const response = await fetch("/api/prepare-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: profileSlug,
          jd: jd
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to prepare prompt");
      }

      const data = await response.json();
      setPreparedPrompt(data.prompt);
    } catch (error) {
      console.error("Prompt preparation error:", error);
      alert("Failed to prepare prompt: " + error.message);
    } finally {
      setPreparingPrompt(false);
    }
  };

  // Copy prompt to clipboard
  const handleCopyPrompt = async () => {
    if (!preparedPrompt) return;
    await copyToClipboard(preparedPrompt, "prompt");
  };

  // Generate PDF (with optional manual AI response)
  const handleGenerate = async () => {
    if (!jd.trim()) {
      alert("Please enter a job description");
      return;
    }

    if (!selectedProfileData || !profileSlug) {
      alert("Profile data not loaded");
      return;
    }

    // If using manual response, check if it's provided
    if (!gptResponse.trim()) {
      alert("Please paste the GPT response in the text area below");
      return;
    }

    setDisable(true);
    setElapsedTime(0);
    startTimeRef.current = Date.now();

    // Start timer
    timerIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: profileSlug,
          jd: jd,
          companyName: companyName.trim() || null,
          aiResponse: gptResponse.trim() // Pass manual AI response
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${profileName?.replace(/\s+/g, "_") || profileSlug}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setLastGenerationTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate PDF: " + error.message);
    } finally {
      setDisable(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      startTimeRef.current = null;
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Professional theme colors
  const themeColors = {
    dark: {
      bg: "#0f172a",
      cardBg: "#1e293b",
      cardBorder: "#334155",
      text: "#f1f5f9",
      textSecondary: "#cbd5e1",
      textMuted: "#94a3b8",
      inputBg: "#1e293b",
      inputBorder: "#475569",
      inputFocus: "#3b82f6",
      textareaBg: "#1e293b",
      buttonBg: "#3b82f6",
      buttonHover: "#2563eb",
      buttonText: "#ffffff",
      buttonDisabled: "#475569",
      successBg: "rgba(34, 197, 94, 0.1)",
      successText: "#22c55e",
      infoBg: "rgba(59, 130, 246, 0.1)",
      infoText: "#3b82f6",
      copyBg: "rgba(59, 130, 246, 0.15)",
      copyHover: "rgba(59, 130, 246, 0.25)",
    },
    light: {
      bg: "#ffffff",
      cardBg: "#ffffff",
      cardBorder: "#e2e8f0",
      text: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#64748b",
      inputBg: "#ffffff",
      inputBorder: "#cbd5e1",
      inputFocus: "#3b82f6",
      textareaBg: "#ffffff",
      buttonBg: "#3b82f6",
      buttonHover: "#2563eb",
      buttonText: "#ffffff",
      buttonDisabled: "#cbd5e1",
      successBg: "rgba(34, 197, 94, 0.1)",
      successText: "#16a34a",
      infoBg: "rgba(59, 130, 246, 0.1)",
      infoText: "#2563eb",
      copyBg: "#f1f5f9",
      copyHover: "#e2e8f0",
    }
  };

  const colors = themeColors[theme];

  if (!router.isReady || !profileSlug) {
    return (
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: colors.text }}>Loading...</div>}>
        <LoadingSpinner />
      </Suspense>
    );
  }

  if (loading || !selectedProfileData) {
    return (
      <div style={{
        minHeight: "100vh",
        background: colors.bg,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Suspense fallback={<div style={{ color: colors.text }}>Loading...</div>}>
          <LoadingSpinner />
        </Suspense>
      </div>
    );
  }

  // Quick copy fields
  const quickCopyFields = [
    { key: 'email', label: 'Email', value: selectedProfileData.email, icon: '📧' },
    { key: 'phone', label: 'Phone', value: selectedProfileData.phone, icon: '📞' },
    { key: 'address', label: 'Address', value: selectedProfileData.address, icon: '🏠' },
    { key: 'location', label: 'Location', value: selectedProfileData.location, icon: '📍' },
    { key: 'postalCode', label: 'Postal Code', value: selectedProfileData.postalCode, icon: '✉️' },
    { key: 'lastCompany', label: 'Last Company', value: getLastCompany(), icon: '🏢' },
    { key: 'lastRole', label: 'Last Role', value: getLastRole(), icon: '💼' },
    { key: 'university', label: 'University', value: selectedProfileData.university, icon: '🎓' },
    { key: 'linkedin', label: 'LinkedIn', value: selectedProfileData.linkedin, icon: '💼' },
    { key: 'github', label: 'GitHub', value: selectedProfileData.github, icon: '💻' },
  ].filter(field => field.value); // Only show fields with values

  return (
    <>
      <Head>
        <title>Resume Generator - {profileName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{
        minHeight: "100vh",
        background: colors.bg,
        color: colors.text,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
        padding: "24px 16px",
        transition: "background 0.3s ease, color 0.3s ease"
      }}>
        <div style={{
          maxWidth: "800px",
          margin: "0 auto"
        }}>
          {/* Header Card */}
          <div style={{
            background: colors.cardBg,
            borderRadius: "16px",
            border: `1px solid ${colors.cardBorder}`,
            padding: "24px",
            marginBottom: "20px",
            boxShadow: theme === 'dark' 
              ? '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
              : '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
            transition: "all 0.3s ease"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px"
            }}>
              <div>
                <h1 style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  color: colors.text,
                  margin: "0 0 6px 0",
                  letterSpacing: "-0.3px"
                }}>
                  {profileName}
                </h1>
                {selectedProfileData.title && (
                  <p style={{
                    fontSize: "14px",
                    color: colors.textSecondary,
                    margin: 0,
                    fontWeight: "400"
                  }}>
                    {selectedProfileData.title}
                  </p>
                )}
              </div>
              <button
                onClick={toggleTheme}
                style={{
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: "500",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "10px",
                  color: colors.text,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme === 'dark' ? '#334155' : '#f8fafc';
                  e.currentTarget.style.borderColor = colors.inputFocus;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.inputBg;
                  e.currentTarget.style.borderColor = colors.inputBorder;
                }}
              >
                <span>{theme === "dark" ? "☀️" : "🌙"}</span>
                <span>{theme === "dark" ? "Light" : "Dark"}</span>
              </button>
            </div>

            {/* Quick Copy Buttons */}
            {quickCopyFields.length > 0 && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: "10px",
                paddingTop: "20px",
                borderTop: `1px solid ${colors.cardBorder}`
              }}>
                {quickCopyFields.map(({ key, label, value, icon }) => (
                  <button
                    key={key}
                    onClick={() => copyToClipboard(value, key)}
                    style={{
                      padding: "12px 8px",
                      background: copiedField === key ? colors.copyBg : colors.inputBg,
                      border: `1px solid ${copiedField === key ? colors.infoText : colors.inputBorder}`,
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      minHeight: "70px",
                      justifyContent: "center"
                    }}
                    onMouseEnter={(e) => {
                      if (copiedField !== key) {
                        e.currentTarget.style.background = colors.copyHover;
                        e.currentTarget.style.borderColor = colors.inputFocus;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (copiedField !== key) {
                        e.currentTarget.style.background = colors.inputBg;
                        e.currentTarget.style.borderColor = colors.inputBorder;
                      }
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>{icon}</span>
                    <div style={{
                      fontSize: "10px",
                      fontWeight: "500",
                      color: copiedField === key ? colors.successText : colors.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.3px"
                    }}>
                      {copiedField === key ? "Copied!" : label}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Form Card */}
          <div style={{
            background: colors.cardBg,
            borderRadius: "16px",
            border: `1px solid ${colors.cardBorder}`,
            padding: "28px",
            boxShadow: theme === 'dark' 
              ? '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
              : '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
            transition: "all 0.3s ease"
          }}>
            {/* Job Description */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: colors.textSecondary,
                marginBottom: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Job Description
              </label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the job description here..."
                rows="10"
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  color: colors.text,
                  background: colors.textareaBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "10px",
                  outline: "none",
                  resize: "vertical",
                  minHeight: "200px",
                  lineHeight: "1.6",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.inputFocus;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)'}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.inputBorder;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Company Name */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: colors.textSecondary,
                marginBottom: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Company Name <span style={{ fontWeight: "400", textTransform: "none" }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name for filename..."
                style={{
                  width: "100%",
                  padding: "12px 18px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  color: colors.text,
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "10px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.inputFocus;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)'}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.inputBorder;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Prepare Prompt and Copy Buttons */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <button
                onClick={handlePreparePrompt}
                disabled={preparingPrompt || !jd.trim()}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  fontSize: "15px",
                  fontWeight: "600",
                  color: colors.buttonText,
                  background: preparingPrompt || !jd.trim() ? colors.buttonDisabled : colors.buttonBg,
                  border: "none",
                  borderRadius: "10px",
                  cursor: preparingPrompt || !jd.trim() ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: preparingPrompt || !jd.trim() ? "none" : theme === 'dark' ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "0 2px 8px rgba(59, 130, 246, 0.2)"
                }}
                onMouseEnter={(e) => {
                  if (!preparingPrompt && jd.trim()) {
                    e.currentTarget.style.background = colors.buttonHover;
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = theme === 'dark' ? "0 6px 16px rgba(59, 130, 246, 0.4)" : "0 4px 12px rgba(59, 130, 246, 0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!preparingPrompt && jd.trim()) {
                    e.currentTarget.style.background = colors.buttonBg;
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = theme === 'dark' ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "0 2px 8px rgba(59, 130, 246, 0.2)";
                  }
                }}
              >
                {preparingPrompt ? "Preparing..." : "Prepare Prompt for GPT"}
              </button>
              <button
                onClick={handleCopyPrompt}
                disabled={!preparedPrompt}
                style={{
                  padding: "14px 20px",
                  fontSize: "15px",
                  fontWeight: "600",
                  color: colors.buttonText,
                  background: !preparedPrompt ? colors.buttonDisabled : colors.buttonBg,
                  border: "none",
                  borderRadius: "10px",
                  cursor: !preparedPrompt ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  boxShadow: !preparedPrompt ? "none" : theme === 'dark' ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "0 2px 8px rgba(59, 130, 246, 0.2)"
                }}
                onMouseEnter={(e) => {
                  if (preparedPrompt) {
                    e.currentTarget.style.background = colors.buttonHover;
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = theme === 'dark' ? "0 6px 16px rgba(59, 130, 246, 0.4)" : "0 4px 12px rgba(59, 130, 246, 0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (preparedPrompt) {
                    e.currentTarget.style.background = colors.buttonBg;
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = theme === 'dark' ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "0 2px 8px rgba(59, 130, 246, 0.2)";
                  }
                }}
              >
                {copiedField === "prompt" ? "Copied!" : "Copy the Prompt"}
              </button>
            </div>

            {/* Prompt Ready Indicator */}
            {preparedPrompt && (
              <div style={{
                padding: "12px 16px",
                background: colors.successBg,
                border: `1px solid ${colors.successText}`,
                borderRadius: "10px",
                color: colors.successText,
                fontSize: "13px",
                textAlign: "center",
                fontWeight: "500",
                marginBottom: "16px"
              }}>
                ✓ Prompt ready! Click "Copy the Prompt" to copy it.
              </div>
            )}

            {/* GPT Response Textarea */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: colors.textSecondary,
                marginBottom: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                GPT Response
              </label>
              <textarea
                value={gptResponse}
                onChange={(e) => setGptResponse(e.target.value)}
                placeholder="Paste the GPT response here after copying the prompt and getting the answer from GPT..."
                rows="8"
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  color: colors.text,
                  background: colors.textareaBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "10px",
                  outline: "none",
                  resize: "vertical",
                  minHeight: "140px",
                  lineHeight: "1.6",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.inputFocus;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)'}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.inputBorder;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Generate PDF Button */}
            <button
              onClick={handleGenerate}
              disabled={disable || !jd.trim() || !gptResponse.trim()}
              style={{
                width: "100%",
                padding: "16px 24px",
                fontSize: "16px",
                fontWeight: "600",
                color: colors.buttonText,
                background: disable || !jd.trim() || !gptResponse.trim() ? colors.buttonDisabled : colors.buttonBg,
                border: "none",
                borderRadius: "10px",
                cursor: disable || !jd.trim() || !gptResponse.trim() ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                marginBottom: "16px",
                boxShadow: disable || !jd.trim() || !gptResponse.trim() ? "none" : theme === 'dark' ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "0 2px 8px rgba(59, 130, 246, 0.2)"
              }}
              onMouseEnter={(e) => {
                if (!disable && jd.trim() && gptResponse.trim()) {
                  e.currentTarget.style.background = colors.buttonHover;
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = theme === 'dark' ? "0 6px 16px rgba(59, 130, 246, 0.4)" : "0 4px 12px rgba(59, 130, 246, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!disable && jd.trim() && gptResponse.trim()) {
                  e.currentTarget.style.background = colors.buttonBg;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = theme === 'dark' ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "0 2px 8px rgba(59, 130, 246, 0.2)";
                }
              }}
            >
              {disable ? `Generating... (${elapsedTime}s)` : "Generate Resume PDF"}
            </button>

            {/* Status Messages */}
            {lastGenerationTime !== null && lastGenerationTime > 0 && (
              <div style={{
                padding: "12px 16px",
                background: colors.successBg,
                border: `1px solid ${colors.successText}`,
                borderRadius: "10px",
                color: colors.successText,
                fontSize: "13px",
                textAlign: "center",
                fontWeight: "500"
              }}>
                ✓ Resume generated successfully in {lastGenerationTime}s
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
