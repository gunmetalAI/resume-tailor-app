import { createResumeTemplate } from '../TemplateBase';

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
        nameColor: '#16a34a',
        nameUppercase: true,
    },
    fonts: {
        body: 'Helvetica',
        baseSize: 11,
        nameSize: 26,
    },
    sectionTitles: {
        summary: 'Professional Summary',
        skills: 'Technical Skills',
        experience: 'Professional Experience',
        education: 'Education',
    },
    headerLayout: 'center',
});

export default ResumeModernGreen;

