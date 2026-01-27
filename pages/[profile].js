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

  // Generate PDF
  const handleGenerate = async () => {
    if (!jd.trim()) {
      alert("Please enter a job description");
      return;
    }

    if (!selectedProfileData || !profileSlug) {
      alert("Profile data not loaded");
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
          companyName: companyName.trim() || null
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
        padding: "16px",
        transition: "background 0.3s ease, color 0.3s ease"
      }}>
        <div style={{
          maxWidth: "800px",
          margin: "0 auto"
        }}>
          {/* Header Card */}
          <div style={{
            background: colors.cardBg,
            borderRadius: "8px",
            border: `1px solid ${colors.cardBorder}`,
            padding: "16px",
            marginBottom: "12px",
            boxShadow: theme === 'dark' ? '0 2px 4px rgba(0, 0, 0, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px"
            }}>
              <div>
                <h1 style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: colors.text,
                  margin: "0 0 2px 0"
                }}>
                  {profileName}
                </h1>
                {selectedProfileData.title && (
                  <p style={{
                    fontSize: "12px",
                    color: colors.textSecondary,
                    margin: 0
                  }}>
                    {selectedProfileData.title}
                  </p>
                )}
              </div>
              <button
                onClick={toggleTheme}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "500",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "6px",
                  color: colors.text,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme === 'dark' ? '#334155' : '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.inputBg;
                }}
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
            </div>

            {/* Quick Copy Buttons */}
            {quickCopyFields.length > 0 && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                gap: "8px",
                paddingTop: "12px",
                borderTop: `1px solid ${colors.cardBorder}`
              }}>
                {quickCopyFields.map(({ key, label, value, icon }) => (
                  <button
                    key={key}
                    onClick={() => copyToClipboard(value, key)}
                    style={{
                      padding: "8px 6px",
                      background: copiedField === key ? colors.copyBg : colors.inputBg,
                      border: `1px solid ${copiedField === key ? colors.infoText : colors.inputBorder}`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      minHeight: "60px",
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
            borderRadius: "8px",
            border: `1px solid ${colors.cardBorder}`,
            padding: "16px",
            boxShadow: theme === 'dark' ? '0 2px 4px rgba(0, 0, 0, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            {/* Job Description */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "600",
                color: colors.textSecondary,
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.3px"
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
                  padding: "10px 12px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  color: colors.text,
                  background: colors.textareaBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "6px",
                  outline: "none",
                  resize: "vertical",
                  minHeight: "180px",
                  lineHeight: "1.5",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.inputFocus;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.infoBg}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.inputBorder;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Company Name */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "600",
                color: colors.textSecondary,
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.3px"
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
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  color: colors.text,
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "6px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.inputFocus;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.infoBg}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.inputBorder;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={disable || !jd.trim()}
              style={{
                width: "100%",
                padding: "10px 16px",
                fontSize: "14px",
                fontWeight: "600",
                color: colors.buttonText,
                background: disable || !jd.trim() ? colors.buttonDisabled : colors.buttonBg,
                border: "none",
                borderRadius: "6px",
                cursor: disable || !jd.trim() ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                marginBottom: "12px",
                boxShadow: disable || !jd.trim() ? "none" : theme === 'dark' ? "0 2px 8px rgba(59, 130, 246, 0.3)" : "0 1px 4px rgba(59, 130, 246, 0.2)"
              }}
              onMouseEnter={(e) => {
                if (!disable && jd.trim()) {
                  e.currentTarget.style.background = colors.buttonHover;
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = theme === 'dark' ? "0 4px 12px rgba(59, 130, 246, 0.4)" : "0 2px 8px rgba(59, 130, 246, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!disable && jd.trim()) {
                  e.currentTarget.style.background = colors.buttonBg;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = theme === 'dark' ? "0 2px 8px rgba(59, 130, 246, 0.3)" : "0 1px 4px rgba(59, 130, 246, 0.2)";
                }
              }}
            >
              {disable ? `Generating... (${elapsedTime}s)` : "Generate Resume PDF"}
            </button>

            {/* Status Messages */}
            {lastGenerationTime && (
              <div style={{
                padding: "10px 12px",
                background: colors.successBg,
                border: `1px solid ${colors.successText}`,
                borderRadius: "6px",
                color: colors.successText,
                fontSize: "12px",
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
