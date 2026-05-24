# Wings Landing Page — État & TODO

## Ce qui marche

- Route `/` → Landing Wings (palette violet, tokens CSS)
- Route `/app` → redirige vers `/dashboard` (avec auth via PrivateRoute)
- Design tokens dans `src/styles/wings-tokens.css` importés dans `main.jsx`
- Toggle thème dark/light persisté en localStorage, appliqué sans flash au chargement
- Logo Wings animé (battement d'ailes en boucle, CSS keyframes dans le SVG)
- Hero : H1 "Wings: Just fly it." avec stagger mot par mot (framer-motion)
- Hero : effet scale + fade au scroll (GSAP ScrollTrigger, scrub)
- Section Principe : 3 cards avec apparition en stagger au scroll (useInView -100px)
- Section Sous le capot : 5 features avec apparition en stagger au scroll
- Section CTA finale avec bouton Décoller
- Footer minimal avec © 2026 Wings — INPT Groupe 4
- Scroll fluide via Lenis (@studio-freight/lenis v1)
- Boutons hover scale 1.05 (transition Tailwind)
- Nav fixe avec backdrop-blur adaptée au thème

## Ce qui pourrait être amélioré

- **Mockup dashboard** : intégrer une vraie preview de l'interface dans la section Hero ou Principe (screenshot ou composant UI simplifié)
- **Section "Démo" interactive** : ajouter un mini-démo cliquable qui simule l'upload de fichier ou l'invitation d'un membre
- **Animations d'entrée enrichies** : particules ou trails autour du WingsLogo au Hero, parallax sur le fond
- **Navigation mobile** : menu hamburger pour les liens centre de la nav sur petits écrans (actuellement masqués en `hidden md:flex`)
- **Anchor scroll Lenis** : les liens `#principe`, `#capot`, `#demo` utilisent le scroll natif. Pour scroll Lenis fluide sur les ancres, il faudrait intercept le `click` et appeler `lenis.scrollTo('#principe')` — nécessite d'exposer l'instance Lenis hors du hook
- **Transitions inter-sections** : séparateurs visuels (courbes SVG ou dégradés) entre les sections pour briser le découpage brusque
- **Testimonials / social proof** : section avec des quotes d'étudiants INPT ou noms de projets réels
- **Accessibilité** : ajouter `prefers-reduced-motion` pour désactiver les animations GSAP/framer-motion si l'utilisateur a activé cette préférence système

## Bugs connus

- **Lenis + GSAP ScrollTrigger** : sans `lenis.on('scroll', ScrollTrigger.update)`, les triggers GSAP peuvent être décalés par rapport à la position réelle du scroll Lenis. En pratique, l'effet hero reste correct car il s'appuie sur le scroll natif détecté par ScrollTrigger. Si des animations futures ne se déclenchent pas au bon moment, il faudra ajouter ce pont : `lenis.on('scroll', ScrollTrigger.update)` dans `useLenis.js`
- **Flash thème** : mitigé via l'init synchrone dans `main.jsx`, mais si JS tarde à s'exécuter, un bref flash light→dark peut apparaître (cas extrêmement rare)
- **`color-mix()` nav background** : la transparence de la nav est calculée en JS (valeur rgba hardcodée par thème) plutôt que via CSS variables — à refactoriser si de nouveaux thèmes sont ajoutés
