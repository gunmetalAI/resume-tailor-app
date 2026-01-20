import { createResumeTemplate } from '../TemplateBase';

export const ResumeCreativeBurgundy = createResumeTemplate({
    colors: {
        primary: '#000000',
        primaryDark: '#000000',
        textDark: '#000000',
        textMedium: '#333333',
        textLight: '#666666',
        sectionTitleColor: '#000000',
        nameColor: '#000000',
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

