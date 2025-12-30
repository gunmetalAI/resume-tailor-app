import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { extractYear, BoldText } from './utils';

// Styles
const styles = StyleSheet.create({
  page: {
    padding: '15mm',
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#1e293b',
  },
  header: {
    textAlign: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#2563eb',
  },
  title: {
    fontSize: 12,
    fontWeight: 'normal',
    marginBottom: 6,
    color: '#475569',
  },
  contact: {
    fontSize: 9.5,
    color: '#64748b',
    lineHeight: 1.4,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#1e40af',
    backgroundColor: '#eff6ff',
    padding: '8px 15px',
    marginBottom: 10,
    letterSpacing: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  summary: {
    fontSize: 10.5,
    lineHeight: 1.7,
    textAlign: 'left',
    color: '#1e293b',
  },
  skillsCategory: {
    marginBottom: 4,
    lineHeight: 1.4,
    flexDirection: 'row',
    width: '100%',
  },
  skillsLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
    marginRight: 8,
    flexShrink: 0,
  },
  skillsList: {
    fontSize: 10,
    color: '#475569',
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
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  expDates: {
    fontSize: 9.5,
    color: '#3b82f6',
    fontWeight: 600,
  },
  expCompany: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 3,
    fontStyle: 'italic',
  },
  expDetails: {
    marginLeft: 16,
  },
  expDetailItem: {
    fontSize: 10,
    lineHeight: 1.4,
    marginBottom: 2,
    color: '#1e293b',
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
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  eduDates: {
    fontSize: 9.5,
    color: '#3b82f6',
    fontWeight: 600,
  },
  eduSchool: {
    fontSize: 10,
    color: '#64748b',
    fontStyle: 'italic',
  },
});

const ResumeTemplate = ({ data }) => {
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
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

        {/* Summary */}
        {summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <BoldText text={summary} style={styles.summary} />
          </View>
        )}

        {/* Skills */}
        {skills && Object.keys(skills).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Areas of Expertise</Text>
            {Object.entries(skills).map(([category, skillList], idx) => (
              <View key={idx} style={styles.skillsCategory}>
                <Text style={styles.skillsLabel}>{category}:</Text>
                <Text style={styles.skillsList}>{Array.isArray(skillList) ? skillList.join(', ') : skillList}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Experience */}
        {experience && experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Experience</Text>
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

        {/* Education */}
        {education && education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education & Credentials</Text>
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

export default ResumeTemplate;

