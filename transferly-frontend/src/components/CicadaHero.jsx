import { Link } from 'react-router-dom';
import cicada from '../assets/cicada.svg';

export default function CicadaHero() {
  return (
    <section
      id="hero"
      style={{
        position:       'relative',
        minHeight:      '100vh',
        background:     'var(--wings-bg)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        overflow:       'hidden',
      }}
    >

      {/* Halo bleu — statique */}
      <div
        style={{
          position:      'absolute',
          inset:         0,
          zIndex:        1,
          pointerEvents: 'none',
          opacity:       0.2,
          background:    'radial-gradient(ellipse 800px 800px at 50% 50%, rgba(0,74,173,0.6) 0%, transparent 70%)',
          filter:        'blur(120px)',
        }}
      />

      {/* Cigale SVG — arrière-plan pâle, s'adapte au mode via CSS */}
      <img
        src={cicada}
        alt=""
        draggable={false}
        style={{
          position: 'relative',
          zIndex:   5,
          width:    '90%',
          maxWidth: 1400,
          height:   'auto',
          display:  'block',
          filter:   'var(--wings-cicada-filter)',
          opacity:  'var(--wings-cicada-opacity)',
        }}
      />

      {/* Lumière dorée centrale — statique */}
      <div
        style={{
          position:      'absolute',
          zIndex:        7,
          left:          '50%',
          top:           '50%',
          transform:     'translate(-50%, -50%)',
          width:         500,
          height:        500,
          borderRadius:  '50%',
          background:    'radial-gradient(circle, rgba(255,193,7,0.5) 0%, rgba(255,193,7,0.15) 40%, transparent 70%)',
          filter:        'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Contenu texte — visible immédiatement */}
      <div
        style={{
          position:       'absolute',
          inset:          0,
          zIndex:         10,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center', padding: '0 24px' }}>

          {/* WINGS */}
          <h1
            style={{
              fontFamily:    'Georgia, "Times New Roman", serif',
              fontSize:      120,
              fontWeight:    300,
              letterSpacing: 16,
              color:         'var(--wings-text)',
              textShadow:    '0 0 40px rgba(79,139,255,0.6)',
              margin:        0,
              lineHeight:    1,
            }}
          >
            WINGS
          </h1>

          {/* just fly it */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 30, height: 1.5, background: 'var(--wings-gold)', opacity: 0.6, flexShrink: 0 }} />
            <span style={{
              fontFamily:    'monospace',
              fontSize:      13,
              fontWeight:    700,
              letterSpacing: 7,
              textTransform: 'uppercase',
              color:         'var(--wings-gold)',
            }}>
              just fly it
            </span>
            <div style={{ width: 30, height: 1.5, background: 'var(--wings-gold)', opacity: 0.6, flexShrink: 0 }} />
          </div>

          {/* Slogan */}
          <p
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontStyle:  'italic',
              fontSize:   18,
              color:      'var(--wings-text-muted)',
              maxWidth:   420,
              lineHeight: 1.6,
              margin:     0,
            }}
          >
            Ton équipe, tes fichiers, ton rythme.<br />
            On s'occupe du reste.
          </p>

          {/* Boutons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <Link
              to="/login"
              style={{
                padding:        '12px 32px',
                borderRadius:   9999,
                fontSize:       14,
                fontWeight:     600,
                color:          '#ffffff',
                background:     'var(--wings-blue)',
                textDecoration: 'none',
                display:        'inline-block',
                transition:     'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 28px rgba(79,139,255,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              Décoller →
            </Link>

            <button
              onClick={() => document.getElementById('principe')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                padding:        '12px 32px',
                borderRadius:   9999,
                fontSize:       14,
                fontWeight:     600,
                color:          'var(--wings-gold)',
                border:         '1px solid var(--wings-gold)',
                background:     'transparent',
                cursor:         'pointer',
                transition:     'background 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,193,7,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Découvrir ↓
            </button>
          </div>

        </div>
      </div>

    </section>
  );
}
