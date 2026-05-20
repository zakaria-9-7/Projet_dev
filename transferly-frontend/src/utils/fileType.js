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
