export const EDITABLE_EXTENSIONS = new Set([
  'txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml', 'log', 'ini', 'env',
  'py', 'java', 'c', 'cpp', 'h', 'hpp', 'js', 'ts', 'jsx', 'tsx',
  'html', 'htm', 'css', 'scss', 'sass', 'sql', 'rb', 'go', 'rs', 'php',
]);

export function isEditable(filename) {
  if (!filename || !filename.includes('.')) return false;
  const ext = filename.split('.').pop().toLowerCase();
  return EDITABLE_EXTENSIONS.has(ext);
}

const FILE_TYPE_COLORS = {
  pdf:  { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  doc:  { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  docx: { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  xls:  { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
  xlsx: { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
  py:   { bg: 'rgba(234,179,8,0.15)',   color: '#facc15' },
  js:   { bg: 'rgba(234,179,8,0.15)',   color: '#facc15' },
  ts:   { bg: 'rgba(234,179,8,0.15)',   color: '#facc15' },
  jsx:  { bg: 'rgba(234,179,8,0.15)',   color: '#facc15' },
  tsx:  { bg: 'rgba(234,179,8,0.15)',   color: '#facc15' },
  jpg:  { bg: 'rgba(168,85,247,0.15)',  color: '#c084fc' },
  jpeg: { bg: 'rgba(168,85,247,0.15)',  color: '#c084fc' },
  png:  { bg: 'rgba(168,85,247,0.15)',  color: '#c084fc' },
  gif:  { bg: 'rgba(168,85,247,0.15)',  color: '#c084fc' },
  svg:  { bg: 'rgba(168,85,247,0.15)',  color: '#c084fc' },
  mp4:  { bg: 'rgba(236,72,153,0.15)',  color: '#f472b6' },
  mp3:  { bg: 'rgba(236,72,153,0.15)',  color: '#f472b6' },
  zip:  { bg: 'rgba(251,146,60,0.15)',  color: '#fb923c' },
  rar:  { bg: 'rgba(251,146,60,0.15)',  color: '#fb923c' },
  json: { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  xml:  { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  txt:  { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
  md:   { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
  csv:  { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
};

export function getFileTypeColor(nom) {
  const ext = nom?.split('.').pop()?.toLowerCase() || '';
  return FILE_TYPE_COLORS[ext] || { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8' };
}
