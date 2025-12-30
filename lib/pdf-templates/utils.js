import React from 'react';
import { Text } from '@react-pdf/renderer';

// Helper function to extract year from date string
export const extractYear = (dateStr) => {
  if (!dateStr) return '';
  const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? yearMatch[0] : dateStr;
};

// Helper component to render text with bold tags
export const BoldText = ({ text, style }) => {
  if (!text) return null;
  
  // Check if text contains <strong> tags
  if (!text.includes('<strong>')) {
    return <Text style={style}>{text}</Text>;
  }

  const parts = [];
  const regex = /<strong>(.*?)<\/strong>/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'normal', text: text.substring(lastIndex, match.index) });
    }
    parts.push({ type: 'bold', text: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'normal', text: text.substring(lastIndex) });
  }

  // If no parts were found, return plain text
  if (parts.length === 0) {
    return <Text style={style}>{text}</Text>;
  }

  // Build nested Text components
  return (
    <Text style={style}>
      {parts.map((part, idx) => {
        if (part.type === 'bold') {
          return (
            <Text key={idx} style={{ fontWeight: 'bold' }}>
              {part.text}
            </Text>
          );
        }
        return part.text;
      })}
    </Text>
  );
};

