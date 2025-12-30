import { createResumeTemplate } from './TemplateBase';

// Template configurations based on HTML templates
export const ResumeTechTeal = createResumeTemplate({
    colors: {
        primary: '#0d9488',
        textDark: '#134e4a',
        textMedium: '#0f766e',
        textLight: '#64748b',
        sectionBg: '#f0fdfa',
        sectionTitleColor: '#0d9488',
        summaryBg: '#f0fdfa',
        summaryBorderLeft: true,
        summaryPadding: '12px 15px',
        summaryBorderRadius: 3,
    },
    fonts: {
        body: 'Helvetica',
        baseSize: 10.5,
    },
    sectionTitles: {
        summary: 'Summary',
        skills: 'Technical Skills',
        experience: 'Experience',
        education: 'Education',
    },
    headerLayout: 'split',
});

export const ResumeModernGreen = createResumeTemplate({
    colors: {
        primary: '#16a34a',
        primaryDark: '#15803d',
        textDark: '#14532d',
        textMedium: '#166534',
        textLight: '#6b7280',
        headerBg: '#f0fdf4',
        sectionBg: '#ecfdf5',
        sectionTitleColor: '#15803d',
    },
    fonts: {
        body: 'Helvetica',
        baseSize: 11,
        nameSize: 24,
    },
    sectionTitles: {
        summary: 'Professional Summary',
        skills: 'Technical Skills',
        experience: 'Professional Experience',
        education: 'Education',
    },
    headerLayout: 'center',
});

export const ResumeCreativeBurgundy = createResumeTemplate({
    colors: {
        primary: '#7f1d1d',
        primaryDark: '#5f1414',
        textDark: '#111827',
        textMedium: '#374151',
        textLight: '#6b7280',
        headerBg: '#fef2f2',
        sectionBg: '#fef2f2',
        sectionTitleColor: '#7f1d1d',
        nameColor: '#7f1d1d',
        nameUppercase: true,
    },
    fonts: {
        body: 'Helvetica',
        baseSize: 11,
        nameSize: 26,
    },
    sectionTitles: {
        summary: 'Professional Summary',
        skills: 'Core Competencies',
        experience: 'Professional Experience',
        education: 'Education',
    },
    headerLayout: 'center',
});

export const ResumeBoldEmerald = createResumeTemplate({
    colors: {
        primary: '#059669',
        primaryDark: '#047857',
        textDark: '#064e3b',
        textMedium: '#065f46',
        textLight: '#6b7280',
        headerBg: '#f0fdf4',
        sectionBg: '#ecfdf5',
        sectionTitleColor: '#047857',
        summaryBg: '#f0fdf4',
        summaryBorderLeft: true,
        summaryPadding: '12px 15px',
        summaryBorderRadius: 4,
    },
    fonts: {
        body: 'Helvetica',
        baseSize: 11,
        nameSize: 26,
        nameUppercase: true,
    },
    sectionTitles: {
        summary: 'Summary',
        skills: 'Skills',
        experience: 'Experience',
        education: 'Education',
    },
    headerLayout: 'center',
});

export const ResumeCorporateSlate = createResumeTemplate({
    colors: {
        primary: '#475569',
        primaryDark: '#334155',
        textDark: '#0f172a',
        textMedium: '#334155',
        textLight: '#64748b',
        sectionBg: '#f8fafc',
        sectionTitleColor: '#334155',
    },
    fonts: {
        body: 'Helvetica',
        baseSize: 11,
        nameSize: 24,
    },
    sectionTitles: {
        summary: 'Summary',
        skills: 'Skills',
        experience: 'Experience',
        education: 'Education',
    },
    headerLayout: 'split',
});

export const ResumeExecutiveNavy = createResumeTemplate({
    colors: {
        primary: '#1e3a8a',
        textDark: '#0f172a',
        textMedium: '#1e3a8a',
        textLight: '#64748b',
        headerBg: '#eff6ff',
        sectionBg: '#eff6ff',
        sectionTitleColor: '#1e3a8a',
        nameColor: '#1e3a8a',
        nameUppercase: true,
    },
    fonts: {
        body: 'Times-Roman', // Serif for executive
        baseSize: 10.5,
        nameSize: 26,
    },
    sectionTitles: {
        summary: 'Executive Summary',
        skills: 'Core Competencies',
        experience: 'Professional Experience',
        education: 'Education',
    },
    headerLayout: 'center',
});

export const ResumeClassicCharcoal = createResumeTemplate({
    colors: {
        primary: '#1f2937',
        primaryDark: '#111827',
        textDark: '#030712',
        textMedium: '#1f2937',
        textLight: '#6b7280',
        headerBg: '#f9fafb',
        sectionTitleColor: '#111827',
    },
    fonts: {
        body: 'Times-Roman', // Serif
        baseSize: 10.5,
        nameSize: 24,
    },
    sectionTitles: {
        summary: 'Summary',
        skills: 'Skills',
        experience: 'Experience',
        education: 'Education',
    },
    headerLayout: 'center',
});

export const ResumeConsultantSteel = createResumeTemplate({
    colors: {
        primary: '#475569',
        primaryDark: '#334155',
        textDark: '#0f172a',
        textMedium: '#334155',
        textLight: '#64748b',
        sectionBg: '#f8fafc',
        sectionTitleColor: '#334155',
        summaryBg: '#f8fafc',
        summaryPadding: '8px 12px',
        summaryBorderRadius: 3,
    },
    fonts: {
        body: 'Helvetica',
        baseSize: 10,
        nameSize: 22,
        contactSize: 8.5,
    },
    sectionTitles: {
        summary: 'Executive Summary',
        skills: 'Core Competencies',
        experience: 'Professional Experience',
        education: 'Education',
    },
    headerLayout: 'center',
});

export const ResumeAcademicPurple = createResumeTemplate({
    colors: {
        primary: '#6b46c1',
        textDark: '#1e1b4b',
        textMedium: '#4c1d95',
        textLight: '#6b7280',
        headerBg: '#faf5ff',
        sectionTitleColor: '#6b46c1',
    },
    fonts: {
        body: 'Helvetica',
        baseSize: 11,
        nameSize: 24,
    },
    sectionTitles: {
        summary: 'Professional Summary',
        skills: 'Areas of Expertise',
        experience: 'Professional Experience',
        education: 'Education & Credentials',
    },
    headerLayout: 'center',
});

