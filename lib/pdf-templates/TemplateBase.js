import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { extractYear, BoldText } from './utils';

// Base template component that accepts styling configuration
export const createResumeTemplate = (config) => {
    const {
        colors = {},
        fonts = {},
        sectionTitles = {},
        headerLayout = 'center', // 'center' or 'split'
    } = config;

    const styles = StyleSheet.create({
        page: {
            padding: '15mm',
            fontSize: fonts.baseSize || 11,
            fontFamily: fonts.body || 'Helvetica',
            color: colors.textDark || '#1e293b',
        },
        header: {
            textAlign: headerLayout === 'center' ? 'center' : 'left',
            marginBottom: 14,
            paddingBottom: 10,
            borderBottomWidth: 2,
            borderBottomColor: colors.primary || '#2563eb',
            backgroundColor: colors.headerBg || 'transparent',
            padding: colors.headerBg ? '15px 20px' : 0,
            paddingTop: colors.headerBg ? '15px' : 0,
        },
        headerContent: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
        },
        headerLeft: {},
        name: {
            fontSize: fonts.nameSize || 26,
            fontWeight: 'bold',
            marginBottom: 3,
            color: colors.nameColor || colors.primary || '#2563eb',
            textTransform: colors.nameUppercase ? 'uppercase' : 'none',
        },
        title: {
            fontSize: fonts.titleSize || 12,
            fontWeight: fonts.titleWeight || 'normal',
            marginBottom: 6,
            color: colors.titleColor || colors.textMedium || '#475569',
        },
        contact: {
            fontSize: fonts.contactSize || 9.5,
            color: colors.contactColor || colors.textLight || '#64748b',
            lineHeight: 1.4,
            textAlign: headerLayout === 'split' ? 'right' : 'center',
        },
        contactItem: {
            marginBottom: headerLayout === 'split' ? 3 : 0,
        },
        section: {
            marginBottom: 12,
        },
        sectionTitle: {
            fontSize: fonts.sectionSize || 11,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            color: colors.sectionTitleColor || colors.primaryDark || '#1e40af',
            backgroundColor: colors.sectionBg || '#eff6ff',
            padding: colors.sectionBg ? '8px 15px' : '6px 0',
            marginBottom: 10,
            letterSpacing: 1,
            borderLeftWidth: colors.sectionBg ? 3 : 0,
            borderLeftColor: colors.primary || '#2563eb',
            borderBottomWidth: !colors.sectionBg ? 2 : 0,
            borderBottomColor: !colors.sectionBg ? colors.primaryDark || '#1e40af' : 'transparent',
        },
        summary: {
            fontSize: fonts.summarySize || 10.5,
            lineHeight: 1.7,
            textAlign: 'left',
            color: colors.textDark || '#1e293b',
            backgroundColor: colors.summaryBg || 'transparent',
            padding: colors.summaryPadding || 0,
            marginTop: colors.summaryMarginTop || 0,
            marginBottom: colors.summaryMarginBottom || 0,
            marginLeft: colors.summaryMarginLeft || 0,
            borderTopWidth: colors.summaryBorderTop ? 2 : 0,
            borderBottomWidth: colors.summaryBorderBottom ? 2 : 0,
            borderLeftWidth: colors.summaryBorderLeft ? (colors.summaryBorderLeftWidth || 2) : 0,
            borderTopColor: colors.primary || '#2563eb',
            borderBottomColor: colors.primary || '#2563eb',
            borderLeftColor: colors.primary || '#2563eb',
            borderRadius: colors.summaryBorderRadius || 0,
        },
        skillsCategory: {
            marginBottom: 4,
            lineHeight: 1.4,
            flexDirection: 'row',
            width: '100%',
        },
        skillsLabel: {
            fontSize: fonts.skillsLabelSize || 10,
            fontWeight: 'bold',
            color: colors.skillsLabelColor || colors.primaryDark || '#1e40af',
            marginRight: 8,
            flexShrink: 0,
        },
        skillsList: {
            fontSize: fonts.skillsListSize || 10,
            color: colors.skillsListColor || colors.textMedium || '#475569',
            flex: 1,
        },
        expItem: {
            marginBottom: 10,
        },
        expHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 1,
        },
        expTitle: {
            fontSize: fonts.expTitleSize || 10.5,
            fontWeight: 'bold',
            color: colors.expTitleColor || colors.primaryDark || '#1e40af',
        },
        expDates: {
            fontSize: fonts.expDatesSize || 9.5,
            color: colors.expDatesColor || colors.primary || '#3b82f6',
            fontWeight: 600,
        },
        expCompany: {
            fontSize: fonts.expCompanySize || 10,
            color: colors.expCompanyColor || colors.textMedium || '#475569',
            marginBottom: 3,
            fontStyle: 'italic',
        },
        expDetails: {
            marginLeft: 16,
        },
        expDetailItem: {
            fontSize: fonts.expDetailSize || 10,
            lineHeight: 1.4,
            marginBottom: 2,
            color: colors.textDark || '#1e293b',
        },
        eduItem: {
            marginBottom: 8,
        },
        eduHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 1,
        },
        eduDegree: {
            fontSize: fonts.eduDegreeSize || 10.5,
            fontWeight: 'bold',
            color: colors.eduDegreeColor || colors.primaryDark || '#1e40af',
        },
        eduDates: {
            fontSize: fonts.eduDatesSize || 9.5,
            color: colors.eduDatesColor || colors.primary || '#3b82f6',
            fontWeight: 600,
        },
        eduSchool: {
            fontSize: fonts.eduSchoolSize || 10,
            color: colors.eduSchoolColor || colors.textLight || '#64748b',
            fontStyle: 'italic',
        },
    });

    const TemplateComponent = ({ data }) => {
        const {
            name,
            title,
            email,
            phone,
            location,
            linkedin,
            website,
            summary,
            skills,
            experience,
            education,
        } = data;

        const renderHeader = () => {
            if (headerLayout === 'split') {
                return (
                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <View style={styles.headerLeft}>
                                <Text style={styles.name}>{name}</Text>
                                {title && <Text style={styles.title}>{title}</Text>}
                            </View>
                            <View style={styles.contact}>
                                {email && <Text style={styles.contactItem}>{email}</Text>}
                                {phone && <Text style={styles.contactItem}>{phone}</Text>}
                                {location && <Text style={styles.contactItem}>{location}</Text>}
                                {linkedin && <Text style={styles.contactItem}>{linkedin}</Text>}
                                {website && <Text style={styles.contactItem}>{website}</Text>}
                            </View>
                        </View>
                    </View>
                );
            }

            return (
                <View style={styles.header}>
                    <Text style={styles.name}>{name}</Text>
                    {title && <Text style={styles.title}>{title}</Text>}
                    <Text style={styles.contact}>
                        {email}
                        {phone && ` • ${phone}`}
                        {location && ` • ${location}`}
                        {linkedin && ` • ${linkedin}`}
                        {website && ` • ${website}`}
                    </Text>
                </View>
            );
        };

        return (
            <Document>
                <Page size="A4" style={styles.page}>
                    {renderHeader()}

                    {summary && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{sectionTitles.summary || 'Summary'}</Text>
                            <BoldText text={summary} style={styles.summary} />
                        </View>
                    )}

                    {skills && Object.keys(skills).length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{sectionTitles.skills || 'Skills'}</Text>
                            {Object.entries(skills).map(([category, skillList], idx) => (
                                <View key={idx} style={styles.skillsCategory}>
                                    <Text style={styles.skillsLabel}>{category}:</Text>
                                    <Text style={styles.skillsList}>{Array.isArray(skillList) ? skillList.join(', ') : skillList}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {experience && experience.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{sectionTitles.experience || 'Experience'}</Text>
                            {experience.map((exp, idx) => (
                                <View key={idx} style={styles.expItem}>
                                    <View style={styles.expHeader}>
                                        <Text style={styles.expTitle}>{exp.title || 'Engineer'}</Text>
                                        <Text style={styles.expDates}>
                                            {exp.start_date} – {exp.end_date}
                                        </Text>
                                    </View>
                                    <Text style={styles.expCompany}>
                                        {exp.company}
                                        {exp.location && `, ${exp.location}`}
                                    </Text>
                                    {exp.details && exp.details.length > 0 && (
                                        <View style={styles.expDetails}>
                                            {exp.details.map((detail, detailIdx) => (
                                                <View key={detailIdx} style={{ marginBottom: 2 }}>
                                                    <BoldText text={`• ${detail}`} style={styles.expDetailItem} />
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {education && education.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{sectionTitles.education || 'Education'}</Text>
                            {education.map((edu, idx) => (
                                <View key={idx} style={styles.eduItem}>
                                    <View style={styles.eduHeader}>
                                        <Text style={styles.eduDegree}>{edu.degree}</Text>
                                        <Text style={styles.eduDates}>
                                            {extractYear(edu.start_year)}
                                            {edu.end_year && ` – ${extractYear(edu.end_year)}`}
                                        </Text>
                                    </View>
                                    <Text style={styles.eduSchool}>
                                        {edu.school}
                                        {edu.grade && ` • GPA: ${edu.grade}`}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </Page>
            </Document>
        );
    };

    return TemplateComponent;
};

