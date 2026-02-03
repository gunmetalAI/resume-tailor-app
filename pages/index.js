import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function Home() {
  const router = useRouter();
  const [profileSlug, setProfileSlug] = useState("");
  const [theme, setTheme] = useState("dark");

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
  }, []);

  // Navigate to profile page
  const handleSubmit = (e) => {
    e.preventDefault();
    if (profileSlug.trim()) {
      const slug = profileSlug.trim();
      router.push(`/${slug}`);
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Theme colors
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
      buttonBg: "#3b82f6",
      buttonHover: "#2563eb",
      buttonText: "#ffffff",
      buttonDisabled: "#475569",
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
      buttonBg: "#3b82f6",
      buttonHover: "#2563eb",
      buttonText: "#ffffff",
      buttonDisabled: "#cbd5e1",
    }
  };

  const colors = themeColors[theme];

  return (
    <>
      <Head>
        <title>Resume Generator</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{
        minHeight: "100vh",
        background: colors.bg,
        color: colors.text,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
        padding: "24px 16px",
        transition: "background 0.3s ease, color 0.3s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          width: "100%",
          maxWidth: "600px"
        }}>
          <div style={{
            width: "100%",
            background: colors.cardBg,
            borderRadius: "16px",
            border: `1px solid ${colors.cardBorder}`,
            padding: "48px 40px",
            boxShadow: theme === 'dark' 
              ? '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
              : '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
            transition: "all 0.3s ease"
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "40px"
            }}>
              <h1 style={{
                fontSize: "32px",
                fontWeight: "700",
                color: colors.text,
                margin: 0,
                letterSpacing: "-0.5px"
              }}>
                Resume Generator
              </h1>
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

            {/* Profile Slug Input */}
            <form onSubmit={handleSubmit} style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px"
            }}>
              <div>
                <label style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Enter Profile ID
                </label>
                <input
                  type="text"
                  value={profileSlug}
                  onChange={(e) => setProfileSlug(e.target.value)}
                  placeholder="Enter your profile ID..."
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    fontSize: "15px",
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

              <button
                type="submit"
                disabled={!profileSlug.trim()}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: colors.buttonText,
                  background: profileSlug.trim() ? colors.buttonBg : colors.buttonDisabled,
                  border: "none",
                  borderRadius: "10px",
                  cursor: profileSlug.trim() ? "pointer" : "not-allowed",
                  transition: "all 0.2s ease",
                  boxShadow: profileSlug.trim() 
                    ? (theme === 'dark' ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "0 2px 8px rgba(59, 130, 246, 0.2)")
                    : "none"
                }}
                onMouseEnter={(e) => {
                  if (profileSlug.trim()) {
                    e.currentTarget.style.background = colors.buttonHover;
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = theme === 'dark' 
                      ? "0 6px 16px rgba(59, 130, 246, 0.4)" 
                      : "0 4px 12px rgba(59, 130, 246, 0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (profileSlug.trim()) {
                    e.currentTarget.style.background = colors.buttonBg;
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = theme === 'dark' 
                      ? "0 4px 12px rgba(59, 130, 246, 0.3)" 
                      : "0 2px 8px rgba(59, 130, 246, 0.2)";
                  }
                }}
              >
                Go to Profile
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
