import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'motion/react';
import { Shield, Sliders, ShieldCheck, ArrowRight, Share2, Zap, Lock } from 'lucide-react';

/* ── Animation variants ─────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeUp}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/* ── Glow dot decoration ────────────────────────── */
function Glow({ color = 'cyan', className = '' }) {
  const c = color === 'violet' ? '#a78bfa' : '#06b6d4';
  return (
    <div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        background: c,
        filter: 'blur(120px)',
        opacity: 0.18,
      }}
    />
  );
}

/* ── Gradient text helper ───────────────────────── */
function GradientText({ children, className = '' }) {
  return (
    <span
      className={`bg-clip-text text-transparent ${className}`}
      style={{ backgroundImage: 'linear-gradient(135deg, #06b6d4 0%, #a78bfa 100%)' }}
    >
      {children}
    </span>
  );
}

/* ── Feature card ───────────────────────────────── */
function FeatureCard({ icon: Icon, title, desc, accent, delay }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const border = accent === 'violet' ? 'rgba(167,139,250,0.2)' : 'rgba(6,182,212,0.2)';
  const glow   = accent === 'violet' ? 'rgba(167,139,250,0.08)' : 'rgba(6,182,212,0.08)';
  const iconBg = accent === 'violet' ? 'rgba(167,139,250,0.1)' : 'rgba(6,182,212,0.1)';
  const iconC  = accent === 'violet' ? '#a78bfa' : '#06b6d4';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      style={{
        background: `linear-gradient(135deg, #13131a 0%, #0d0d14 100%)`,
        border: `1px solid ${border}`,
        boxShadow: `0 0 40px ${glow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
      className="rounded-2xl p-7 flex flex-col gap-4"
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center"
        style={{ background: iconBg }}
      >
        <Icon style={{ color: iconC }} className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-white font-semibold text-base mb-1.5">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ── Step card ──────────────────────────────────── */
function Step({ n, title, desc, delay }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-5 items-start"
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold text-sm"
        style={{
          background: 'linear-gradient(135deg, #06b6d4, #a78bfa)',
          color: '#fff',
        }}
      >
        {n}
      </div>
      <div>
        <p className="text-white font-semibold text-sm mb-1">{title}</p>
        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
export default function Landing() {
  return (
    <div
      className="min-h-screen font-sans antialiased overflow-x-hidden"
      style={{ background: '#0a0a0f', color: '#fff' }}
    >

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50" style={{ backdropFilter: 'blur(20px)', background: 'rgba(10,10,15,0.8)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #a78bfa)' }}>
              <Share2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">Transferly</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Connexion
            </Link>
            <Link
              to="/register"
              className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #a78bfa)' }}
            >
              Commencer
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14">
        {/* Glows */}
        <Glow color="cyan"   className="w-[600px] h-[600px] -top-32 -left-48" />
        <Glow color="violet" className="w-[500px] h-[500px] -bottom-20 -right-32" />

        {/* Grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-8"
            style={{
              border: '1px solid rgba(6,182,212,0.3)',
              background: 'rgba(6,182,212,0.08)',
              color: '#06b6d4',
            }}
          >
            <Zap className="w-3 h-3" />
            Chiffrement de bout en bout · MFA obligatoire
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight mb-6"
          >
            Le partage de fichiers,{' '}
            <br className="hidden sm:block" />
            <GradientText>réinventé pour les équipes académiques</GradientText>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="text-slate-400 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10"
          >
            Sécurisé, simple, sans concessions. Vos fichiers chiffrés de bout en bout,
            vos permissions millimétrées.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.38 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              to="/register"
              className="group flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.03] hover:shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #a78bfa)',
                boxShadow: '0 0 32px rgba(6,182,212,0.35)',
              }}
            >
              Commencer gratuitement
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all hover:border-slate-500"
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#cbd5e1',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <Lock className="w-3.5 h-3.5" />
              Se connecter
            </Link>
          </motion.div>

          {/* Social proof strip */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-10 text-xs text-slate-600"
          >
            Gratuit · Sans carte bancaire · Données hébergées en France
          </motion.p>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative py-28 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#06b6d4' }}>
              Pourquoi Transferly
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Tout ce dont votre équipe a besoin,{' '}
              <GradientText>rien de superflu</GradientText>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FeatureCard
              icon={Shield}
              accent="cyan"
              title="Chiffrement AES-128"
              desc="Vos fichiers protégés au repos avec une clé que vous seul contrôlez. Zéro accès côté serveur."
              delay={0}
            />
            <FeatureCard
              icon={Sliders}
              accent="violet"
              title="Permissions granulaires"
              desc="Qui lit, qui écrit, qui télécharge, vous décidez — au fichier et à l'utilisateur près."
              delay={0.1}
            />
            <FeatureCard
              icon={ShieldCheck}
              accent="cyan"
              title="MFA & audit complet"
              desc="Double facteur obligatoire à chaque connexion. Traçabilité complète de chaque action sur la plateforme."
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative py-24 overflow-hidden">
        <Glow color="violet" className="w-[400px] h-[400px] top-1/2 -translate-y-1/2 -left-40" />

        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left — text */}
            <div>
              <Reveal>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#a78bfa' }}>
                  Comment ça marche
                </p>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
                  Opérationnel en{' '}
                  <GradientText>moins de 2 minutes</GradientText>
                </h2>
                <p className="text-slate-400 text-base leading-relaxed mb-10">
                  Pas de configuration complexe. Créez votre compte, invitez votre équipe,
                  commencez à partager en toute sécurité.
                </p>
              </Reveal>

              <div className="flex flex-col gap-7">
                <Step n={1} delay={0}    title="Créez votre compte" desc="Inscription en 30 secondes, vérification OTP par email incluse." />
                <Step n={2} delay={0.1}  title="Créez ou rejoignez un espace" desc="Un espace par projet ou par cours. Invitez vos collaborateurs par email." />
                <Step n={3} delay={0.2}  title="Déposez et partagez" desc="Glissez vos fichiers, configurez les permissions, partagez le lien." />
              </div>
            </div>

            {/* Right — visual card */}
            <Reveal className="relative">
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                  border: '1px solid rgba(6,182,212,0.15)',
                  background: 'linear-gradient(145deg, #13131a, #0d0d14)',
                  boxShadow: '0 0 60px rgba(6,182,212,0.08)',
                }}
              >
                {/* Fake file list UI */}
                <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                    <span className="ml-2 text-xs text-slate-500">Mon espace — Projets 2026</span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {[
                    { name: 'TP_Réseaux_S4.pdf',       size: '2.4 MB', perm: 'Lecture', color: '#06b6d4' },
                    { name: 'Cours_Python_Avancé.zip',  size: '18 MB',  perm: 'Écriture', color: '#a78bfa' },
                    { name: 'Rapport_Final_ICCN.docx',  size: '1.1 MB', perm: 'Partage',  color: '#34d399' },
                  ].map((f, i) => (
                    <motion.div
                      key={f.name}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.12, duration: 0.5 }}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        📄
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">{f.name}</p>
                        <p className="text-[11px] text-slate-500">{f.size}</p>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: `${f.color}15`, color: f.color, border: `1px solid ${f.color}30` }}
                      >
                        {f.perm}
                      </span>
                    </motion.div>
                  ))}

                  <div className="flex items-center gap-2 pt-2">
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '38%' }}
                        transition={{ delay: 0.9, duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #06b6d4, #a78bfa)' }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0">38 % utilisé</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="relative py-28 overflow-hidden">
        <Glow color="cyan"   className="w-[500px] h-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5">
              Prêt à <GradientText>sécuriser</GradientText> votre flux de travail ?
            </h2>
            <p className="text-slate-400 text-lg mb-10">
              Rejoignez des équipes qui font confiance à Transferly pour partager sans compromis.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/register"
                className="group flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.03]"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #a78bfa)',
                  boxShadow: '0 0 40px rgba(6,182,212,0.3)',
                }}
              >
                Commencer maintenant
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 rounded-xl font-semibold text-sm text-slate-300 transition-colors hover:text-white"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Se connecter
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="py-8 text-center text-xs text-slate-600"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        © {new Date().getFullYear()} Transferly — Fait avec soin pour les équipes académiques.
      </footer>
    </div>
  );
}
