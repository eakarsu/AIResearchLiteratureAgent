import React from 'react';
import PublicationsPerYearChart from '../components/PublicationsPerYearChart';
import CitationCooccurrenceHeatmap from '../components/CitationCooccurrenceHeatmap';
import LiteratureReviewPdfPanel from '../components/LiteratureReviewPdfPanel';
import PaperFilterRulesEditor from '../components/PaperFilterRulesEditor';

export default function CustomViewsPage() {
  return (
    <div>
      <h1 style={{ color: '#e94560', marginBottom: 6 }}>Lit Views</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Custom views for research literature: trends, topic structure, exports, and filter rules.</p>
      <PublicationsPerYearChart />
      <CitationCooccurrenceHeatmap />
      <LiteratureReviewPdfPanel />
      <PaperFilterRulesEditor />
    </div>
  );
}
