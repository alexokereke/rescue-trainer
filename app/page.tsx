'use client'

import type { CSSProperties } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Chest3D from './components/Chest3D'
import LiveTrainer from './components/LiveTrainer'
import CameraTrainer from './components/CameraTrainer'
import CprFilm from './components/CprFilm'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0 },
}

export default function Home() {
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 500], [0, 80])
  const glowY = useTransform(scrollY, [0, 600], [0, -60])

  return (
    <main style={styles.page}>
      {/* NAV */}
      <header style={styles.nav}>
        <div style={styles.logo}>❤️ RESCUE Trainer</div>
        <nav style={styles.navLinks}>
          <a href="#steps" style={styles.navLink}>How it works</a>
          <a href="#features" style={styles.navLink}>Features</a>
          <a href="#trainer" style={styles.navLink}>Trainer</a>
        </nav>
        <a href="#trainer" style={styles.navButton}>Start Training</a>
      </header>

      {/* HERO */}
      <section style={styles.hero}>
        <motion.div style={{ ...styles.glowOne, y: glowY }} />
        <motion.div style={{ ...styles.glowTwo, y: heroY }} />

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.7 }}
          style={styles.heroText}
        >
          <span style={styles.badge}>Interactive CPR Training</span>

          <h1 style={styles.title}>
            Learn CPR with rhythm, feedback and confidence.
          </h1>

          <p style={styles.subtitle}>
            Watch CPR in motion below, follow the 110 BPM beat, and practise with
            voice coaching, camera feedback and an interactive 3D chest trainer.
          </p>

          <div style={styles.heroButtons}>
            <a href="#trainer" style={styles.primaryButton}>Start Training</a>
            <a href="#steps" style={styles.secondaryButton}>See How It Works</a>
          </div>

          <div style={styles.metricsRow}>
            <div style={styles.metric}>
              <strong>110 BPM</strong>
              <span>Compression rhythm</span>
            </div>
            <div style={styles.metric}>
              <strong>5 cm</strong>
              <span>Depth target</span>
            </div>
            <div style={styles.metric}>
              <strong>Live</strong>
              <span>Voice + camera coach</span>
            </div>
          </div>

          <p style={styles.disclaimer}>
            Training prototype only. Not a medical device. Always call 911 / 999 / 112
            in a real emergency.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          style={styles.heroCard}
        >
          <div style={styles.pulseCircle}>♥</div>
          <h3 style={{ margin: 0, fontSize: 28 }}>110 BPM</h3>
          <p style={styles.cardText}>Compression rhythm guide</p>
          <div style={styles.metricsMini}>
            <div style={styles.metricMini}>
              <strong>Watch</strong>
              <span>CPR film</span>
            </div>
            <div style={styles.metricMini}>
              <strong>Follow</strong>
              <span>The beat</span>
            </div>
            <div style={styles.metricMini}>
              <strong>Practise</strong>
              <span>3D trainer</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* STEPS */}
      <section id="steps" style={styles.section}>
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          style={styles.sectionTitle}
        >
          Train in 3 simple steps
        </motion.h2>

        <div style={styles.grid}>
          {[
            ['1', 'Watch the film', 'Scroll to the training area and watch how compressions should look. Use Pause or Slow mode to study the movement.'],
            ['2', 'Start the 3D demo', 'Press Start on the 3D Demo + Voice trainer and follow the guided prompts.'],
            ['3', 'Follow the beat', 'Match the 110 BPM rhythm, then use voice and camera feedback to improve.'],
          ].map(([num, title, text], i) => (
            <motion.div
              key={num}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.55, delay: i * 0.12 }}
              style={styles.card}
            >
              <div style={styles.stepNumber}>{num}</div>
              <h3 style={styles.cardTitle}>{title}</h3>
              <p style={styles.cardText}>{text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={styles.section}>
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          style={styles.sectionTitle}
        >
          Built like a modern health app
        </motion.h2>

        <div style={styles.grid}>
          {[
            ['🎬', 'CPR Film', 'A slow, controllable film shows the compression motion before you start.'],
            ['🫀', '3D Chest Trainer', 'Rotate the chest and press the target in time with the beat.'],
            ['🎙️', 'Voice Guidance', 'Audio prompts help you stay focused while practising.'],
            ['📷', 'Camera Feedback', 'Use your camera to support movement and posture feedback.'],
          ].map(([icon, title, text], i) => (
            <motion.div
              key={title}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              whileHover={{ y: -6 }}
              style={styles.card}
            >
              <div style={styles.icon}>{icon}</div>
              <h3 style={styles.cardTitle}>{title}</h3>
              <p style={styles.cardText}>{text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TRAINER — CprFilm lives here, above the 3D Demo + Voice */}
      <section id="trainer" style={styles.section}>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6 }}
        >
          <h2 style={styles.sectionTitle}>Your Training Area</h2>
          <p style={styles.sectionText}>
            Practise on a mannequin or training surface only. Do not practise
            compressions on a real person.
          </p>
        </motion.div>

        {/* CPR FILM + 3D DEMO + VOICE */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
          style={styles.trainerCard}
        >
          <h3 style={styles.trainerTitle}>🎬 Watch CPR in motion</h3>
          <p style={styles.trainerText}>
            Watch the compression movement first. Use <strong>Pause</strong> or{' '}
            <strong>Slow mode</strong> to study the hand position, then start the
            3D demo below and follow the beat.
          </p>

          <CprFilm />

          <div style={{ marginTop: 24 }}>
            <Chest3D />
          </div>
        </motion.div>

        {/* LIVE TRAINER */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
          style={styles.trainerCard}
        >
          <LiveTrainer />
        </motion.div>

        {/* CAMERA TRAINER */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
          style={styles.trainerCard}
        >
          <CameraTrainer />
        </motion.div>
      </section>

      {/* FOOTER CTA */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6 }}
        style={styles.cta}
      >
        <h2 style={{ fontSize: 36, margin: '0 0 12px' }}>Ready to practise?</h2>
        <p style={{ opacity: 0.85, marginBottom: 24 }}>
          Build confidence one beat at a time.
        </p>
        <a href="#trainer" style={styles.primaryButton}>Start Training</a>
      </motion.section>
    </main>
  )
}

const styles: Record<string, CSSProperties> = {
  page: {
    fontFamily: 'Arial, sans-serif',
    background: '#F4FAF8',
    color: '#07332F',
    overflowX: 'hidden',
  },
  nav: {
    position: 'sticky',
    top: 16,
    zIndex: 50,
    margin: '16px auto 0',
    maxWidth: 1120,
    width: 'calc(100% - 32px)',
    boxSizing: 'border-box',
    padding: '14px 20px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(14px)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 10px 35px rgba(7,51,47,0.10)',
  },
  logo: { fontWeight: 900, fontSize: 18, whiteSpace: 'nowrap' },
  navLinks: { display: 'flex', gap: 22 },
  navLink: { color: '#07332F', textDecoration: 'none', fontWeight: 700, fontSize: 14 },
  navButton: {
    background: '#E63946',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: 999,
    textDecoration: 'none',
    fontWeight: 800,
    fontSize: 14,
    whiteSpace: 'nowrap',
  },
  hero: {
    position: 'relative',
    maxWidth: 1120,
    margin: '0 auto',
    padding: '70px 20px 80px',
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 40,
    alignItems: 'center',
    zIndex: 0,
  },
  glowOne: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: '50%',
    background: '#BFEFE4',
    filter: 'blur(70px)',
    top: 20,
    left: -80,
    zIndex: -1,
  },
  glowTwo: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: '50%',
    background: '#FFD6D6',
    filter: 'blur(70px)',
    bottom: 0,
    right: -60,
    zIndex: -1,
  },
  heroText: {},
  badge: {
    display: 'inline-block',
    background: '#DFF5EE',
    color: '#087F6E',
    padding: '8px 12px',
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 13,
  },
  title: {
    fontSize: 'clamp(40px, 6vw, 64px)',
    lineHeight: 1.03,
    margin: '22px 0 18px',
    letterSpacing: '-2px',
  },
  subtitle: { fontSize: 18, lineHeight: 1.7, color: '#47635E', maxWidth: 560, margin: 0 },
  heroButtons: { display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 28 },
  primaryButton: {
    background: '#E63946',
    color: '#fff',
    padding: '15px 22px',
    borderRadius: 999,
    textDecoration: 'none',
    fontWeight: 900,
    boxShadow: '0 14px 30px rgba(230,57,70,0.28)',
  },
  secondaryButton: {
    background: '#fff',
    color: '#07332F',
    padding: '15px 22px',
    borderRadius: 999,
    textDecoration: 'none',
    fontWeight: 900,
    border: '1px solid #D7E8E2',
  },
  metricsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginTop: 28,
    maxWidth: 520,
  },
  metric: {
    background: '#fff',
    border: '1px solid #DFF0EA',
    borderRadius: 18,
    padding: 14,
    display: 'grid',
    gap: 4,
    fontSize: 13,
    color: '#668079',
  },
  disclaimer: { marginTop: 22, fontSize: 13, color: '#7A8F8A', maxWidth: 520, lineHeight: 1.6 },
  heroCard: {
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid #DFF0EA',
    borderRadius: 32,
    padding: 30,
    boxShadow: '0 30px 70px rgba(7,51,47,0.13)',
    textAlign: 'center',
  },
  pulseCircle: {
    width: 110,
    height: 110,
    margin: '0 auto 20px',
    borderRadius: '50%',
    background: '#E63946',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    fontSize: 52,
    boxShadow: '0 0 0 18px rgba(230,57,70,0.10), 0 0 0 38px rgba(230,57,70,0.05)',
  },
  metricsMini: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginTop: 24,
  },
  metricMini: {
    background: '#F4FAF8',
    borderRadius: 18,
    padding: 14,
    display: 'grid',
    gap: 4,
    fontSize: 13,
    color: '#668079',
  },
  section: { maxWidth: 1120, margin: '0 auto', padding: '70px 20px', boxSizing: 'border-box' },
  sectionTitle: { fontSize: 'clamp(30px, 5vw, 46px)', textAlign: 'center', margin: '0 0 34px', letterSpacing: '-1px' },
  sectionText: { textAlign: 'center', color: '#668079', lineHeight: 1.7, marginTop: -16, marginBottom: 34 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18 },
  card: {
    background: '#fff',
    border: '1px solid #DFF0EA',
    borderRadius: 26,
    padding: 24,
    boxShadow: '0 18px 40px rgba(7,51,47,0.07)',
  },
  cardTitle: { margin: '0 0 8px', fontSize: 19 },
  cardText: { color: '#668079', lineHeight: 1.7, fontSize: 15, margin: 0 },
  stepNumber: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: '#087F6E',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 900,
    marginBottom: 14,
  },
  icon: { fontSize: 34, marginBottom: 10 },
  trainerCard: {
    background: '#fff',
    border: '1px solid #DFF0EA',
    borderRadius: 30,
    padding: 18,
    marginBottom: 22,
    boxShadow: '0 20px 50px rgba(7,51,47,0.08)',
  },
  trainerTitle: { margin: '4px 0 8px', fontSize: 22 },
  trainerText: { margin: '0 0 16px', color: '#668079', lineHeight: 1.7 },
  cta: {
    maxWidth: 1120,
    margin: '30px auto 70px',
    width: 'calc(100% - 40px)',
    boxSizing: 'border-box',
    padding: '54px 24px',
    textAlign: 'center',
    background: '#07332F',
    color: '#fff',
    borderRadius: 34,
  },
}