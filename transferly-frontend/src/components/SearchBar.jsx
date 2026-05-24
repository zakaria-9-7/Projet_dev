import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Rechercher…' }) {
  return (
    <div style={{ position: 'relative', maxWidth: 480, width: '100%' }}>
      <Search
        size={14}
        style={{
          position: 'absolute',
          left: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--wings-text-muted)',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 38px 10px 38px',
          background: 'var(--wings-surface)',
          border: '0.5px solid var(--wings-border)',
          borderRadius: 10,
          color: 'var(--wings-text)',
          fontSize: 13,
          outline: 'none',
          transition: 'border-color 0.15s',
          boxSizing: 'border-box',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
        onBlur={e => e.target.style.borderColor = 'var(--wings-border)'}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            color: 'var(--wings-text-muted)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 4,
          }}
          title="Effacer"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
