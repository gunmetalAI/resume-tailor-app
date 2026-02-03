import React from 'react';
import { Text } from '@react-pdf/renderer';

// Helper function to extract year from date string
export const extractYear = (dateStr) => {
  if (!dateStr) return '';
  const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? yearMatch[0] : dateStr;
};

// Helper component to render text with bold tags (supports both HTML <strong> and Markdown **)
export const BoldText = ({ text, style }) => {
  if (!text) return null;
  
  // Check if text contains bold markers
  const hasStrongTags = text.includes('<strong>');
  const hasMarkdownBold = text.includes('**');
  
  if (!hasStrongTags && !hasMarkdownBold) {
    return <Text style={style}>{text}</Text>;
  }

  const parts = [];
  let processedText = text;

  // First, convert markdown ** to <strong> tags for unified processing
  processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Now process all <strong> tags using matchAll for safer iteration
  const regex = /<strong>(.*?)<\/strong>/g;
  const matches = Array.from(processedText.matchAll(regex));
  
  if (matches.length === 0) {
    // No matches found, return cleaned text
    const cleanedText = hasMarkdownBold ? text.replace(/\*\*/g, '') : text;
    return <Text style={style}>{cleanedText}</Text>;
  }

  let lastIndex = 0;

  // Process each match
  matches.forEach((match) => {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({ type: 'normal', text: processedText.substring(lastIndex, match.index) });
    }
    // Add the bold text
    parts.push({ type: 'bold', text: match[1] });
    lastIndex = match.index + match[0].length;
  });

  // Add remaining text after last match
  if (lastIndex < processedText.length) {
    parts.push({ type: 'normal', text: processedText.substring(lastIndex) });
  }

  // If no parts were found, return plain text
  if (parts.length === 0) {
    const cleanedText = hasMarkdownBold ? text.replace(/\*\*/g, '') : text;
    return <Text style={style}>{cleanedText}</Text>;
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
        return (
          <Text key={idx}>
            {part.text}
          </Text>
        );
      })}
    </Text>
  );
};

