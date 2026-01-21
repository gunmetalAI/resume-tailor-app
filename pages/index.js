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
      bg: "#1a1d24",
      cardBg: "rgba(30, 33, 40, 0.8)",
      cardBorder: "rgba(255, 255, 255, 0.08)",
      text: "#e4e7eb",
      IDtext: "#2c3e50",
      textSecondary: "#b0b5bb",
      textMuted: "#8a8f95",
      buttonBg: "#4a90e2",
      buttonText: "#ffffff",
      buttonHover: "#5aa0f2",
    },
    light: {
      bg: "#f5f6f8",
      cardBg: "rgba(255, 255, 255, 0.95)",
      cardBorder: "rgba(0, 0, 0, 0.1)",
      text: "#2c3e50",
      IDtext: "#2c3e50",
      textSecondary: "#5a6c7d",
      textMuted: "#7f8c9a",
      buttonBg: "#4a90e2",
      buttonText: "#ffffff",
      buttonHover: "#5aa0f2",
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
        padding: "20px",
        transition: "background 0.3s ease, color 0.3s ease"
      }}>
        <div style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "32px 20px"
        }}>
          <div style={{
            width: "100%",
            background: colors.cardBg,
            borderRadius: "12px",
            border: `1px solid ${colors.cardBorder}`,
            padding: "40px",
            transition: "all 0.2s ease"
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "32px"
            }}>
              <h1 style={{
                fontSize: "28px",
                fontWeight: "600",
                color: colors.text,
                margin: 0
              }}>
                Resume Generator
              </h1>
              <button
                onClick={toggleTheme}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  background: "transparent",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "8px",
                  color: colors.text,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
              </button>
            </div>

            {/* Profile Slug Input */}
            <form onSubmit={handleSubmit} style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}>
              <div>
                <label style={{
                  display: "block",
                  fontSize: "15px",
                  fontWeight: "400",
                  color: colors.textSecondary,
                  marginBottom: "8px"
                }}>
                  Enter Profile ID
                </label>
                <input
                  type="text"
                  value={profileSlug}
                  onChange={(e) => setProfileSlug(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    fontSize: "16px",
                    fontFamily: "inherit",
                    color: colors.IDtext,
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "8px",
                    outline: "none",
                    transition: "all 0.2s ease"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.buttonBg;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.inputBorder;
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={!profileSlug.trim()}
                style={{
                  width: "100%",
                  padding: "14px 24px",
                  fontSize: "16px",
                  fontWeight: "500",
                  color: colors.buttonText,
                  background: profileSlug.trim() ? colors.buttonBg : colors.buttonDisabled,
                  border: "none",
                  borderRadius: "8px",
                  cursor: profileSlug.trim() ? "pointer" : "not-allowed",
                  transition: "all 0.2s ease"
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
