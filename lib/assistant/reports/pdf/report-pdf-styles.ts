import { StyleSheet } from '@react-pdf/renderer';

export const reportPdfStyles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    lineHeight: 1.45,
  },
  coverTitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 6,
  },
  blockWrap: {
    marginBottom: 12,
  },
  body: {
    fontSize: 10,
    marginBottom: 6,
  },
  meta: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#f8fafc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardAccent: {
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  entityCard: {
    backgroundColor: '#ffffff',
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 2,
  },
  rowDesc: {
    fontSize: 9,
    color: '#475569',
    marginBottom: 8,
  },
  badge: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 4,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  statTile: {
    width: '48%',
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 4,
  },
  statTileLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statTileValue: {
    fontSize: 14,
    fontWeight: 700,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  table: {
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 700,
    padding: 6,
    textTransform: 'uppercase',
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableCell: {
    fontSize: 9,
    padding: 6,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 6,
  },
  stepIcon: {
    width: 14,
    fontSize: 10,
    fontWeight: 700,
  },
  linkRow: {
    marginBottom: 4,
  },
  linkLabel: {
    fontSize: 10,
    fontWeight: 600,
  },
  linkHref: {
    fontSize: 8,
    color: '#2563eb',
  },
});

export const reportPdfToneColors: Record<string, string> = {
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  neutral: '#64748b',
};
