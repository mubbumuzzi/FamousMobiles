/** Famous Mobiles design system — single source of truth */
export const tokens = {
  colors: {
    primary: "#2563EB",
    primaryHover: "#1D4ED8",
    secondary: "#06B6D4",
    accent: "#8B5CF6",
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#0F172A",
    muted: "#64748B",
    border: "#E2E8F0",
  },
  gradients: {
    primary: "linear-gradient(135deg, #2563EB 0%, #8B5CF6 100%)",
    hero: "linear-gradient(135deg, #2563EB 0%, #06B6D4 50%, #8B5CF6 100%)",
    card: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
  },
  chart: ["#2563EB", "#06B6D4", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#64748B", "#0891B2"],
  radius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.25rem",
    "2xl": "1rem",
  },
  shadow: {
    sm: "0 1px 3px rgb(15 23 42 / 0.06)",
    md: "0 4px 16px rgb(15 23 42 / 0.08)",
    lg: "0 12px 40px rgb(15 23 42 / 0.12)",
    glow: "0 8px 32px rgb(37 99 235 / 0.2)",
  },
  spacing: {
    page: "1rem",
    section: "1.5rem",
    card: "1.25rem",
  },
} as const;

export type KpiTone = "primary" | "secondary" | "success" | "warning" | "danger" | "accent";

export const kpiTones: Record<KpiTone, { bg: string; text: string; icon: string }> = {
  primary: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-600" },
  secondary: { bg: "bg-cyan-50", text: "text-cyan-700", icon: "text-cyan-600" },
  success: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-600" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-600" },
  danger: { bg: "bg-red-50", text: "text-red-700", icon: "text-red-600" },
  accent: { bg: "bg-violet-50", text: "text-violet-700", icon: "text-violet-600" },
};
