import { createResumeTemplate } from '../TemplateBase';

export const ResumeModernGreen = createResumeTemplate({
    colors: {
        primary: '#16a34a',
        primaryDark: '#15803d',
        textDark: '#14532d',
        textMedium: '#166534',
        textLight: '#6b7280',
        sectionTitleColor: '#15803d',
        nameColor: '#15803d',
        nameUppercase: false,
    },
    fonts: {
        body: 'Helvetica',
        baseSize: 10,
        nameSize: 22,
        contactSize: 8.5,
        titleSize: 11,
        sectionSize: 10,
    },
    sectionTitles: {
        summary: 'Summary',
        skills: 'Skills',
        experience: 'Experience',
        education: 'Education',
    },
    headerLayout: 'split',
});

export default ResumeModernGreen;

