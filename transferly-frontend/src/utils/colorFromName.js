const WINGS_PALETTE = [
  { accent: '#4F8BFF', faint: 'rgba(79,139,255,0.18)' },
  { accent: '#c97b63', faint: 'rgba(201,123,99,0.2)'  },
  { accent: '#6b9b78', faint: 'rgba(107,155,120,0.2)' },
  { accent: '#8e6cb8', faint: 'rgba(142,108,184,0.2)' },
  { accent: '#c69854', faint: 'rgba(198,152,84,0.2)'  },
  { accent: '#5d8ca8', faint: 'rgba(93,140,168,0.2)'  },
  { accent: '#b07cce', faint: 'rgba(176,124,206,0.2)' },
];

export function colorFromName(name) {
  if (!name) return WINGS_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return WINGS_PALETTE[Math.abs(hash) % WINGS_PALETTE.length];
}
