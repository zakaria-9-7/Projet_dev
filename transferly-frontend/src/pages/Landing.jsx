import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'motion/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
import {
  Shield, Upload, Share2, Lock, Users,
  ArrowRight, Mail, Zap, Eye, CheckCircle,
  GraduationCap, KeyRound, Network, Server, FileCheck,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/* ════════════════════════════════════════════════
   FLOW DIAGRAM — academic file-sharing topology
   ════════════════════════════════════════════════ */
function FlowDiagram() {
  return (
    <svg
      viewBox="0 0 520 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-xl"
      aria-hidden="true"
    >
      <defs>
        <pattern id="fd-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0L0 0 0 40" stroke="#E2E8F0" strokeWidth="0.6" fill="none"/>
        </pattern>
        <marker id="arrow-cyan" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0 0 L0 6 L8 3 Z" fill="#06B6D4"/>
        </marker>
        <marker id="arrow-blue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0 0 L0 6 L8 3 Z" fill="#0891B2"/>
        </marker>
      </defs>

      <rect width="520" height="380" fill="url(#fd-grid)"/>

      {/* Connections */}
      <path d="M120 105 C175 105 175 185 225 185"
        stroke="#06B6D4" strokeWidth="1.5" strokeDasharray="5 3"
        markerEnd="url(#arrow-cyan)"/>
      <path d="M120 275 C175 275 175 200 225 200"
        stroke="#06B6D4" strokeWidth="1.5" strokeDasharray="5 3"
        markerEnd="url(#arrow-cyan)"/>
      <path d="M335 185 C375 185 375 145 400 145"
        stroke="#0891B2" strokeWidth="1.5" strokeDasharray="5 3"
        markerEnd="url(#arrow-blue)"/>
      <path d="M335 200 C375 200 375 245 400 245"
        stroke="#0891B2" strokeWidth="1.5" strokeDasharray="5 3"
        markerEnd="url(#arrow-blue)"/>

      {/* Node — Étudiant */}
      <g transform="translate(25,75)">
        <rect width="95" height="60" rx="12" fill="#F0F9FF" stroke="#06B6D4" strokeWidth="1.5"/>
        <rect width="95" height="4" rx="2" fill="#06B6D4"/>
        <text x="47" y="28" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="600" fontFamily="system-ui">Étudiant</text>
        <text x="47" y="44" textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="system-ui">Upload</text>
      </g>

      {/* Node — Professeur */}
      <g transform="translate(25,245)">
        <rect width="95" height="60" rx="12" fill="#F0F9FF" stroke="#06B6D4" strokeWidth="1.5"/>
        <rect width="95" height="4" rx="2" fill="#06B6D4"/>
        <text x="47" y="28" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="600" fontFamily="system-ui">Professeur</text>
        <text x="47" y="44" textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="system-ui">Upload</text>
      </g>

      {/* Central node — Transferly */}
      <g transform="translate(220,155)">
        <rect width="115" height="75" rx="16" fill="#06B6D4" stroke="#0891B2" strokeWidth="1.5"/>
        <rect width="115" height="5" rx="3" fill="#0891B2"/>
        <text x="57" y="32" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="system-ui">Transferly</text>
        <text x="57" y="48" textAnchor="middle" fill="#BAE6FD" fontSize="9" fontFamily="system-ui">AES-256</text>
        <text x="57" y="62" textAnchor="middle" fill="#BAE6FD" fontSize="9" fontFamily="system-ui">JWT + ACL</text>
      </g>

      {/* Node — Destinataire 1 */}
      <g transform="translate(398,115)">
        <rect width="95" height="60" rx="12" fill="#F0F9FF" stroke="#0891B2" strokeWidth="1.5"/>
        <rect width="95" height="4" rx="2" fill="#0891B2"/>
        <text x="47" y="28" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="600" fontFamily="system-ui">Étudiant</text>
        <text x="47" y="44" textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="system-ui">Download</text>
      </g>

      {/* Node — Destinataire 2 */}
      <g transform="translate(398,215)">
        <rect width="95" height="60" rx="12" fill="#F0F9FF" stroke="#0891B2" strokeWidth="1.5"/>
        <rect width="95" height="4" rx="2" fill="#0891B2"/>
        <text x="47" y="28" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="600" fontFamily="system-ui">Professeur</text>
        <text x="47" y="44" textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="system-ui">Révision</text>
      </g>

      {/* Security label */}
      <g transform="translate(208,262)">
        <rect width="105" height="24" rx="12" fill="white" stroke="#06B6D4" strokeWidth="1"/>
        <text x="52" y="16" textAnchor="middle" fill="#0891B2" fontSize="9" fontWeight="600" fontFamily="system-ui">Chiffré de bout en bout</text>
      </g>
    </svg>
  );
}

/* ════════════════════════════════════════════════
   SPLIT-WORD REVEAL — each word clips upward
   ════════════════════════════════════════════════ */
function SplitWords({ text, className = '', delay = 0 }) {
  const words = text.split(' ');
  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '110%' }}
            animate={{ y: '0%' }}
            transition={{ delay: delay + i * 0.09, duration: 0.72, ease: [0.33, 1, 0.68, 1] }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}

/* ════════════════════════════════════════════════
   NAVBAR
   ════════════════════════════════════════════════ */
function Navbar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 inset-x-0 z-50 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/50"
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center gap-8">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
          <Network className="w-5 h-5 text-accent" />
          <span className="text-[15px]">Transferly</span>
        </div>

        <div className="hidden md:flex items-center gap-7 flex-1">
          {[
            { href: '#features',  label: 'Fonctionnalités' },
            { href: '#security',  label: 'Sécurité'        },
            { href: '#about',     label: 'À propos'         },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-sm text-muted hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-accent transition-colors px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Se connecter
          </Link>
          <Link
            to="/register"
            className="text-sm font-semibold bg-accent hover:bg-accent-dark text-white px-5 py-2 rounded-lg transition-colors"
          >
            Démarrer
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

/* ════════════════════════════════════════════════
   HERO
   ════════════════════════════════════════════════ */
function Hero() {
  return (
    <section className="min-h-screen pt-16 flex items-center bg-bg dark:bg-dark-bg">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-24">

        {/* Left */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200/80 dark:border-cyan-800/60 rounded-full px-4 py-1.5 mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-xs font-semibold text-accent-dark tracking-wide">
              Plateforme académique sécurisée
            </span>
          </motion.div>

          <h1 className="text-5xl xl:text-6xl font-extrabold text-slate-900 dark:text-dark-text leading-[1.08] tracking-tight mb-6">
            <SplitWords text="Le savoir circule." delay={0.2} />
            <br />
            <span className="text-accent">
              <SplitWords text="La sécurité, jamais." delay={0.55} />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95 }}
            className="text-lg text-muted dark:text-slate-400 leading-relaxed mb-10 max-w-md"
          >
            Partagez vos cours, TPs et projets avec vos camarades et professeurs.
            Chiffrement bout en bout, ACL granulaire, versioning intégré.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05 }}
            className="flex items-center gap-4 mb-12 flex-wrap"
          >
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm shadow-lg shadow-cyan-200/60 dark:shadow-cyan-900/20"
            >
              Commencer gratuitement <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-muted hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Déjà un compte ?
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.25 }}
            className="flex items-center gap-5 flex-wrap"
          >
            {[
              'MFA intégré',
              'Chiffrement AES-256',
              'Gratuit pour les étudiants',
            ].map(t => (
              <div key={t} className="flex items-center gap-1.5 text-xs text-muted dark:text-slate-500">
                <CheckCircle className="w-3.5 h-3.5 text-accent shrink-0" />
                {t}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right — diagram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.8 }}
          className="relative hidden lg:flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 to-sky-100 dark:from-cyan-900/10 dark:to-sky-900/5 rounded-3xl" />
          <div className="relative z-10 p-10">
            <FlowDiagram />
          </div>

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="absolute top-6 right-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-md"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Chiffré</span>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 1.2 }}
            className="absolute bottom-6 left-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-md"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Multi-rôles</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════
   STATS BAR — pinned-scrub numbers
   ════════════════════════════════════════════════ */
const STATS = [
  { value: '500+',    label: 'Établissements',   icon: GraduationCap },
  { value: '50 000+', label: 'Étudiants actifs',  icon: Users         },
  { value: '99.9 %',  label: 'Disponibilité',     icon: Zap           },
  { value: 'AES-256', label: 'Chiffrement',        icon: Lock          },
];

function StatsBar() {
  const ref   = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      className="py-16 border-y border-border dark:border-slate-700/50 bg-white dark:bg-dark-surface"
    >
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10">
        {STATS.map(({ value, label, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="text-center"
          >
            <Icon className="w-6 h-6 text-accent mx-auto mb-3" />
            <div className="text-3xl font-extrabold text-slate-900 dark:text-dark-text mb-1 tracking-tight">
              {value}
            </div>
            <div className="text-sm text-muted dark:text-slate-400">{label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════
   FEATURES — sticky-stack cards
   ════════════════════════════════════════════════ */
const FEATURES = [
  {
    id: 'upload',
    icon: Upload,
    tag: 'Dépôt de fichiers',
    title: 'Vos ressources, au même endroit',
    body: 'Uploadez cours, TPs et projets. Organisez-les en dossiers, versionnez-les automatiquement. Retrouvez tout en quelques secondes.',
    points: ['Versioning automatique', 'Dossiers et sous-dossiers', 'Recherche instantanée'],
    iconGrad: 'from-cyan-400 to-cyan-600',
    cardBg: 'bg-cyan-50/60 dark:bg-cyan-900/10',
  },
  {
    id: 'share',
    icon: Share2,
    tag: 'Partage précis',
    title: 'Contrôle total sur vos partages',
    body: 'Partagez avec des personnes précises, définissez les permissions (lecture, écriture, téléchargement) et révoquez l\'accès à tout moment.',
    points: ['ACL granulaire', 'Permissions par fichier', 'Partage par lien ou email'],
    iconGrad: 'from-sky-400 to-blue-600',
    cardBg: 'bg-sky-50/60 dark:bg-sky-900/10',
  },
  {
    id: 'secure',
    icon: Shield,
    tag: 'Sécurité avancée',
    title: 'Sécurité de niveau professionnel',
    body: 'Chiffrement AES-256, authentification à deux facteurs, journaux d\'audit complets. Conforme aux exigences des établissements académiques.',
    points: ['Authentification MFA', 'Journaux d\'audit', 'Chiffrement AES-256'],
    iconGrad: 'from-violet-400 to-violet-600',
    cardBg: 'bg-violet-50/60 dark:bg-violet-900/10',
  },
];

function Features() {
  return (
    <section id="features" className="py-32 bg-bg dark:bg-dark-bg">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-20">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs font-bold text-accent uppercase tracking-[.18em] mb-3"
          >
            Fonctionnalités
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="text-4xl font-extrabold text-slate-900 dark:text-dark-text tracking-tight"
          >
            Tout ce dont vous avez besoin
          </motion.h2>
        </div>

        {/* Sticky stack */}
        <div className="flex flex-col gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.id}
              className="sticky"
              style={{ top: `${88 + i * 22}px` }}
            >
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-120px' }}
                transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                className={`${f.cardBg} border border-border dark:border-slate-700/50 rounded-2xl p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-center shadow-sm`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.iconGrad} flex items-center justify-center shadow-sm`}>
                      <f.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-bold text-muted dark:text-slate-400 uppercase tracking-[.14em]">
                      {f.tag}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 dark:text-dark-text mb-4 leading-snug">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted dark:text-slate-400 leading-relaxed mb-6">{f.body}</p>

                  <ul className="flex flex-col gap-2.5">
                    {f.points.map(p => (
                      <li key={p} className="flex items-center gap-2.5 text-sm text-muted dark:text-slate-400">
                        <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual accent */}
                <div className="hidden md:flex items-center justify-center">
                  <div className="relative w-52 h-52">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-white/5 dark:from-white/5 dark:to-transparent border border-white/30 dark:border-slate-700/40" />
                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/60 to-white/10 dark:from-slate-700/30 dark:to-transparent border border-white/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <f.icon className="w-20 h-20 text-accent opacity-[.12]" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════
   SECURITY — horizontal-on-vertical scroll
   ════════════════════════════════════════════════ */
const SEC_CARDS = [
  {
    icon: Lock,
    title: 'Chiffrement AES-256',
    desc: 'Chaque fichier est chiffré avant le stockage. Vos données restent illisibles, même pour nos équipes.',
    color: 'text-cyan-500',
    ring: 'ring-cyan-200 dark:ring-cyan-800/50',
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
  },
  {
    icon: Shield,
    title: 'Authentification MFA',
    desc: 'Double facteur par TOTP. Chaque connexion est protégée par un code unique expirant en 90 secondes.',
    color: 'text-violet-500',
    ring: 'ring-violet-200 dark:ring-violet-800/50',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
  },
  {
    icon: Eye,
    title: 'Journaux d\'audit',
    desc: 'Chaque action est tracée — horodatage, IP, identité. Vision complète pour les administrateurs.',
    color: 'text-blue-500',
    ring: 'ring-blue-200 dark:ring-blue-800/50',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    icon: KeyRound,
    title: 'Contrôle d\'accès ACL',
    desc: 'Permissions granulaires par utilisateur. Lecture, écriture, téléchargement, partage — tout est configurable.',
    color: 'text-sky-500',
    ring: 'ring-sky-200 dark:ring-sky-800/50',
    bg: 'bg-sky-50 dark:bg-sky-900/20',
  },
  {
    icon: Server,
    title: 'Infrastructure souveraine',
    desc: 'Hébergé en Europe. Aucune dépendance à des services tiers. Vos données ne quittent jamais le périmètre.',
    color: 'text-emerald-500',
    ring: 'ring-emerald-200 dark:ring-emerald-800/50',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
];

function SecuritySection() {
  const sectionRef = useRef(null);
  const trackRef   = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track   = trackRef.current;
    if (!section || !track) return;

    const ctx = gsap.context(() => {
      const getX = () => -(track.scrollWidth - window.innerWidth + 96);

      gsap.to(track, {
        x: getX,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${Math.abs(getX()) + window.innerHeight * 0.3}`,
          pin: true,
          scrub: 1.2,
          invalidateOnRefresh: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="security"
      ref={sectionRef}
      className="bg-white dark:bg-dark-surface overflow-hidden"
    >
      <div className="h-screen flex flex-col justify-center px-6 md:px-16">
        {/* Label */}
        <div className="max-w-lg mb-12">
          <p className="text-xs font-bold text-accent uppercase tracking-[.18em] mb-3">
            Sécurité
          </p>
          <h2 className="text-4xl font-extrabold text-slate-900 dark:text-dark-text tracking-tight mb-4">
            Sécurité de niveau entreprise
          </h2>
          <p className="text-sm text-muted dark:text-slate-400 leading-relaxed">
            Chaque couche de la plateforme est conçue pour protéger vos données académiques.
          </p>
        </div>

        {/* Horizontal track */}
        <div
          ref={trackRef}
          className="flex gap-5 will-change-transform"
          style={{ width: 'max-content' }}
        >
          {SEC_CARDS.map((c, i) => (
            <div
              key={i}
              className={`w-72 shrink-0 ${c.bg} ring-1 ${c.ring} rounded-2xl p-8 flex flex-col gap-5`}
            >
              <div className={`w-12 h-12 rounded-xl ${c.bg} ring-1 ${c.ring} flex items-center justify-center`}>
                <c.icon className={`w-6 h-6 ${c.color}`} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-dark-text mb-2">{c.title}</h3>
                <p className="text-sm text-muted dark:text-slate-400 leading-relaxed">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════
   CTA BAND
   ════════════════════════════════════════════════ */
function CTABand() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} id="about" className="py-28 bg-bg dark:bg-dark-bg">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
        className="max-w-3xl mx-auto px-6 text-center"
      >
        <div className="inline-flex items-center gap-2 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200/80 dark:border-cyan-800/60 rounded-full px-4 py-1.5 mb-8">
          <FileCheck className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-semibold text-accent-dark">Rejoignez votre établissement</span>
        </div>

        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-dark-text tracking-tight mb-6 leading-tight">
          Prêt à mieux partager ?
        </h2>
        <p className="text-lg text-muted dark:text-slate-400 leading-relaxed mb-10 max-w-lg mx-auto">
          Créez votre compte gratuitement et rejoignez des milliers d'étudiants et de professeurs qui partagent le savoir avec méthode.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm shadow-lg shadow-cyan-200/60 dark:shadow-cyan-900/20"
          >
            Créer mon compte <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="text-sm font-medium text-muted hover:text-slate-900 dark:hover:text-white transition-colors px-4 py-3.5"
          >
            Se connecter
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ════════════════════════════════════════════════
   FOOTER
   ════════════════════════════════════════════════ */
const FOOTER_COLS = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalités', href: '#features' },
      { label: 'Sécurité',        href: '#security'  },
      { label: 'Tarifs',          href: '#'           },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: 'Documentation',     href: '#' },
      { label: 'Guide utilisateur', href: '#' },
      { label: 'API',               href: '#' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { label: 'Mentions légales', href: '#' },
      { label: 'Confidentialité', href: '#'  },
      { label: 'CGU',             href: '#'  },
    ],
  },
];

function Footer() {
  return (
    <footer className="bg-slate-900 dark:bg-dark-bg border-t border-slate-800 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 text-white mb-4">
              <Network className="w-5 h-5 text-accent" />
              <span className="font-bold text-[15px]">Transferly</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Partagez le savoir.<br />Protégez les données.
            </p>
          </div>

          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <h4 className="text-white text-xs font-bold mb-5 uppercase tracking-[.14em]">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-3">
                {col.links.map(link => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-slate-400 hover:text-accent text-sm transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-8 flex items-center justify-between flex-wrap gap-4">
          <p className="text-slate-500 text-xs">
            2026 Transferly. Tous droits réservés.
          </p>
          <a
            href="mailto:contact@transferly.ma"
            className="text-slate-500 hover:text-accent transition-colors"
          >
            <Mail className="w-4 h-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════════
   ROOT
   ════════════════════════════════════════════════ */
export default function Landing() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });

    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(tick);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div className="bg-bg dark:bg-dark-bg overflow-x-hidden">
      <Navbar />
      <Hero />
      <StatsBar />
      <Features />
      <SecuritySection />
      <CTABand />
      <Footer />
    </div>
  );
}
