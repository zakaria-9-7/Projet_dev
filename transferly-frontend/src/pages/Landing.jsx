import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'motion/react';
import {
  Sun, Moon,
  MessageSquareOff, Users, Shield,
  Layers, KeyRound, History, Zap, ShieldCheck,
} from 'lucide-react';
import CicadaHero from '../components/CicadaHero';
import cicada from '../assets/cicada.svg';
import useLenis from '../hooks/useLenis';

/* ── Variants stagger ────────────────────────────────────── */
const cardContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const cardItem = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

/* ── Data ────────────────────────────────────────────────── */
const principleCards = [
  {
    icon: MessageSquareOff,
    title: 'Fini le chaos.',
    text: "Arrête de chercher tes fichiers entre Discord, WhatsApp et tes mails. Wings centralise tout par projet. Un espace, une équipe, zéro perte de temps.",
  },
  {
    icon: Users,
    title: 'Collaboratif par défaut.',
    text: "Ce n'est pas juste un dossier de stockage, c'est votre QG. Tout le monde pose ses fichiers, commente, met à jour et avance ensemble sur le même projet.",
  },
  {
    icon: Shield,
    title: 'Contrôle total.',
    text: "Tu gères qui voit quoi. Donne les accès complets à ton équipe de dev, ou un simple droit de lecture à ton prof ou ton client. C'est toi qui décides.",
  },
];

const hoodFeatures = [
  {
    icon: Layers,
    title: 'Espaces de travail isolés',
    text: 'Chaque projet a son propre univers étanche.',
  },
  {
    icon: KeyRound,
    title: 'Gestion des rôles (Permissions)',
    text: 'Pour définir précisément les droits de chaque membre.',
  },
  {
    icon: History,
    title: 'Suivi des modifications (Versioning)',
    text: "Reviens en arrière si quelqu'un écrase un fichier par erreur.",
  },
  {
    icon: Zap,
    title: 'Flux de transfert optimisé',
    text: 'Pensé pour être instantané et sans coupure.',
  },
  {
    icon: ShieldCheck,
    title: 'Gestion des sessions par Token',
    text: 'Une architecture moderne pour rester connecté en toute sécurité.',
  },
];

const navLinks = [
  { label: 'Le principe',    href: '#principe' },
  { label: 'Sous le capot', href: '#capot' },
  { label: 'Démo',          href: '#demo' },
];

/* ══════════════════════════════════════════════════════════
   NAV
══════════════════════════════════════════════════════════ */
function Nav({ theme, onToggleTheme }) {
  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-5"
      style={{
        background:           theme === 'dark'
          ? 'rgba(0, 0, 0, 0.82)'
          : 'rgba(253, 252, 247, 0.88)',
        backdropFilter:       'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom:         '1px solid var(--wings-border)',
      }}
    >
      {/* Gauche */}
      <div className="flex items-center">
        <span
          style={{
            fontFamily:    'Georgia, "Times New Roman", serif',
            fontSize:      18,
            letterSpacing: '4px',
            fontWeight:    400,
            color:         'var(--wings-text)',
          }}
        >
          WINGS
        </span>
      </div>

      {/* Centre */}
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map(({ label, href }) => (
          <a
            key={label}
            href={href}
            style={{
              fontFamily:  'monospace',
              fontSize:    13,
              color:       'var(--wings-text-muted)',
              textDecoration: 'none',
              transition:  'color 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--wings-text)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--wings-text-muted)'; }}
          >
            {label}
          </a>
        ))}
      </div>

      {/* Droite */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleTheme}
          className="flex items-center justify-center transition-colors duration-200"
          style={{
            width:      36,
            height:     36,
            borderRadius: 8,
            background: 'var(--wings-surface)',
            border:     '1px solid var(--wings-border)',
            color:      'var(--wings-text-muted)',
            cursor:     'pointer',
          }}
          aria-label="Basculer le thème"
        >
          {theme === 'dark'
            ? <Sun  style={{ width: 15, height: 15 }} />
            : <Moon style={{ width: 15, height: 15 }} />
          }
        </button>

        <Link
          to="/login"
          style={{
            padding:       '8px 16px',
            borderRadius:  8,
            fontSize:      13,
            fontWeight:    500,
            border:        '1px solid var(--wings-gold)',
            color:         'var(--wings-gold)',
            textDecoration: 'none',
            background:    'transparent',
            transition:    'background 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,193,7,0.07)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          Se connecter
        </Link>

        <Link
          to="/register"
          style={{
            padding:       '8px 16px',
            borderRadius:  8,
            fontSize:      13,
            fontWeight:    600,
            background:    'var(--wings-blue)',
            color:         '#ffffff',
            textDecoration: 'none',
            transition:    'filter 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
        >
          Décoller →
        </Link>
      </div>
    </nav>
  );
}

/* ══════════════════════════════════════════════════════════
   LANDING
══════════════════════════════════════════════════════════ */
export default function Landing() {
  const principleRef = useRef(null);
  const hoodRef      = useRef(null);

  const principleInView = useInView(principleRef, { once: true, margin: '-100px' });
  const hoodInView      = useInView(hoodRef,      { once: true, margin: '-100px' });

  const [theme, setTheme] = useState(
    () => localStorage.getItem('wings-theme') || 'dark'
  );

  useLenis();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('wings-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <div
      className="min-h-screen antialiased overflow-x-hidden"
      style={{ background: 'var(--wings-bg)', color: 'var(--wings-text)' }}
    >
      <Nav theme={theme} onToggleTheme={toggleTheme} />

      {/* ════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════ */}
      <CicadaHero />

      {/* ════════════════════════════════════════════
          LE PRINCIPE
      ════════════════════════════════════════════ */}
      <section id="principe" className="py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p
              style={{
                fontFamily:    'monospace',
                fontSize:      11,
                fontWeight:    700,
                letterSpacing: '4px',
                textTransform: 'uppercase',
                color:         'var(--wings-gold)',
                marginBottom:  16,
              }}
            >
              // LE PRINCIPE
            </p>
            <h2
              style={{
                fontFamily:    'Georgia, "Times New Roman", serif',
                fontSize:      'clamp(32px, 5vw, 48px)',
                fontWeight:    400,
                color:         'var(--wings-text)',
                marginBottom:  12,
                lineHeight:    1.2,
              }}
            >
              Fini le bordel des fichiers.
            </h2>
            <p style={{ fontSize: 18, color: 'var(--wings-text-muted)' }}>
              Trois principes simples qui changent tout.
            </p>
          </div>

          <motion.div
            ref={principleRef}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={cardContainer}
            initial="hidden"
            animate={principleInView ? 'visible' : 'hidden'}
          >
            {principleCards.map(({ icon: Icon, title, text }) => (
              <motion.div
                key={title}
                variants={cardItem}
                className="rounded-2xl p-8"
                style={{
                  background: 'var(--wings-surface)',
                  border:     '0.5px solid var(--wings-border)',
                }}
              >
                <Icon
                  style={{
                    width:        32,
                    height:       32,
                    color:        'var(--wings-blue)',
                    marginBottom: 20,
                  }}
                />
                <h3
                  style={{
                    fontFamily:   'Georgia, "Times New Roman", serif',
                    fontSize:     22,
                    fontWeight:   400,
                    color:        'var(--wings-text)',
                    marginBottom: 12,
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontSize:   15,
                    lineHeight: 1.65,
                    color:      'var(--wings-text-muted)',
                  }}
                >
                  {text}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SOUS LE CAPOT
      ════════════════════════════════════════════ */}
      <section id="capot" className="py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p
              style={{
                fontFamily:    'monospace',
                fontSize:      11,
                fontWeight:    700,
                letterSpacing: '4px',
                textTransform: 'uppercase',
                color:         'var(--wings-gold)',
                marginBottom:  16,
              }}
            >
              // SOUS LE CAPOT
            </p>
            <h2
              style={{
                fontFamily:    'Georgia, "Times New Roman", serif',
                fontSize:      'clamp(32px, 5vw, 48px)',
                fontWeight:    400,
                color:         'var(--wings-text)',
                marginBottom:  12,
                lineHeight:    1.2,
              }}
            >
              Pensé pour bien faire les choses.
            </h2>
            <p style={{ fontSize: 18, color: 'var(--wings-text-muted)' }}>
              Voici ce qui tourne discrètement pendant que tu bosses.
            </p>
          </div>

          <motion.div
            ref={hoodRef}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
            variants={cardContainer}
            initial="hidden"
            animate={hoodInView ? 'visible' : 'hidden'}
          >
            {hoodFeatures.map(({ icon: Icon, title, text }) => (
              <motion.div
                key={title}
                variants={cardItem}
                className="flex items-start gap-5"
              >
                <Icon
                  style={{
                    width:     24,
                    height:    24,
                    color:     'var(--wings-blue)',
                    marginTop: 2,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <h3
                    style={{
                      fontSize:     17,
                      fontWeight:   600,
                      color:        'var(--wings-text)',
                      marginBottom: 6,
                    }}
                  >
                    {title}
                  </h3>
                  <p style={{ fontSize: 15, color: 'var(--wings-text-muted)', lineHeight: 1.6 }}>
                    {text}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          CTA
      ════════════════════════════════════════════ */}
      <section id="demo" className="py-32">
        <div className="max-w-3xl mx-auto px-6 text-center">
          {/* Petite cigale avec halo doré */}
          <div
            className="flex items-center justify-center mb-10"
            style={{ position: 'relative' }}
          >
            <div
              style={{
                position:     'absolute',
                width:        160,
                height:       160,
                borderRadius: '50%',
                background:   'radial-gradient(circle, rgba(255,193,7,0.38) 0%, transparent 70%)',
                filter:       'blur(24px)',
              }}
            />
            <img
              src={cicada}
              alt=""
              style={{ width: 100, height: 'auto', objectFit: 'contain', position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 12px rgba(79,139,255,0.5))' }}
              draggable={false}
            />
          </div>

          <h2
            style={{
              fontFamily:    'Georgia, "Times New Roman", serif',
              fontSize:      'clamp(36px, 6vw, 56px)',
              fontWeight:    400,
              color:         'var(--wings-text)',
              marginBottom:  20,
              lineHeight:    1.2,
            }}
          >
            Prêt à décoller ?
          </h2>

          <p
            style={{
              fontSize:     18,
              color:        'var(--wings-text-muted)',
              lineHeight:   1.7,
              maxWidth:     480,
              margin:       '0 auto 40px',
            }}
          >
            Quelques secondes pour créer ton compte. Une vie pour ne plus
            envoyer de fichier en pièce jointe.
          </p>

          <Link
            to="/register"
            style={{
              display:       'inline-block',
              padding:       '16px 48px',
              borderRadius:  12,
              fontSize:      18,
              fontWeight:    600,
              color:         '#ffffff',
              background:    'var(--wings-blue)',
              textDecoration: 'none',
              boxShadow:     '0 0 40px rgba(79,139,255,0.35)',
              transition:    'filter 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.filter     = 'brightness(1.1)';
              e.currentTarget.style.boxShadow  = '0 0 48px rgba(255,193,7,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.filter     = 'none';
              e.currentTarget.style.boxShadow  = '0 0 40px rgba(79,139,255,0.35)';
            }}
          >
            Décoller →
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════ */}
      <footer
        className="py-12 px-8 flex flex-col sm:flex-row items-center justify-between text-sm"
        style={{
          borderTop: '0.5px solid var(--wings-border)',
          color:     'var(--wings-text-muted)',
        }}
      >
        <span>© 2026 Wings</span>
        <span>Conçu sous l'œil de la cigale.</span>
      </footer>
    </div>
  );
}
