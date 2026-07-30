import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '@/lib/assistant/reports/pdf/msqdx/pdf-styles';

export function PdfQuickCheckCoverContent({
  eyebrow,
  title,
  projectLine,
  metaLines,
  leadText,
  scoreItems,
}: {
  eyebrow: string;
  title: string;
  projectLine: string;
  metaLines: string[];
  leadText?: string | null;
  scoreItems: Array<{ label: string; value: string }>;
}) {
  return (
    <>
      <Text style={pdfStyles.coverEyebrow}>{eyebrow}</Text>
      <Text style={pdfStyles.coverTitle}>{title}</Text>
      <View style={pdfStyles.coverUrlBox}>
        <Text style={pdfStyles.coverUrl}>{projectLine}</Text>
      </View>
      {metaLines.length > 0 ? (
        <View style={pdfStyles.coverMeta}>
          {metaLines.map((line, index) => (
            <Text key={`meta-${index}`} style={pdfStyles.coverMetaItem}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      {leadText ? <Text style={pdfStyles.leadText}>{leadText}</Text> : null}
      {scoreItems.length > 0 ? (
        <View style={pdfStyles.scoreGrid}>
          {scoreItems.slice(0, 4).map((item) => (
            <View key={item.label} style={pdfStyles.scoreCard}>
              <Text style={pdfStyles.scoreCardValue}>{item.value}</Text>
              <Text style={pdfStyles.scoreCardLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}
