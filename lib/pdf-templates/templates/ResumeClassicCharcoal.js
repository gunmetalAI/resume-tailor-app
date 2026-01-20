import { createResumeTemplate } from '../TemplateBase';

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

export default ResumeClassicCharcoal;

