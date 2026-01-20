import { createResumeTemplate } from '../TemplateBase';

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
        nameSize: 28,
        titleSize: 13,
        sectionSize: 12,
    },
    sectionTitles: {
        summary: 'Professional Summary',
        skills: 'Core Competencies',
        experience: 'Professional Experience',
        education: 'Education',
    },
    headerLayout: 'center',
});

export default ResumeCreativeBurgundy;

