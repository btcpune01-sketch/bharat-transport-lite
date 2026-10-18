import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import {
  Activity,
  ArrowRight,
  Fingerprint,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Truck,
  Zap
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

const fleetStatus = 'FLEET-2031 • EV CARGO STATUS: ACTIVE • ROUTE OPTIMIZED'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()
  const reduceMotion = useReducedMotion()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setError('')
      setLoading(true)
      setIsLoggingIn(true)

      await new Promise((resolve) => window.setTimeout(resolve, 1500))
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      console.error('Sign-in request failed', {
        status: err.response?.status ?? null,
        code: err.code ?? null
      })
      setError(err.response?.data?.error || err.message || 'Unable to sign in. Check your credentials and try again.')
    } finally {
      setLoading(false)
      setIsLoggingIn(false)
    }
  }

  return (
    <main className="btc-login">
      <style>{`
        .btc-login {
          --btc-cyan: #22d3ee;
          --btc-muted: #82a6bd;
          position: relative;
          display: flex;
          min-height: 100vh;
          flex-direction: column;
          overflow: hidden;
          padding: 26px clamp(20px, 4.1vw, 68px) 20px;
          color: #e5f7ff;
          background-color: #020b14;
          background-image:
            radial-gradient(ellipse at 26% 48%, rgba(0, 132, 255, .14), transparent 38%),
            radial-gradient(ellipse at 85% 20%, rgba(34, 211, 238, .08), transparent 32%),
            linear-gradient(rgba(38, 133, 177, .07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(38, 133, 177, .07) 1px, transparent 1px);
          background-size: auto, auto, 48px 48px, 48px 48px;
          font-family: Inter, 'Segoe UI', sans-serif;
        }
        .btc-login::before {
          position: absolute;
          z-index: 0;
          inset: 0;
          background: linear-gradient(90deg, transparent 49.9%, rgba(34, 211, 238, .08) 50%, transparent 50.1%);
          content: '';
          pointer-events: none;
        }
        .btc-login-header, .btc-login-stage, .btc-login-hud {
          position: relative;
          z-index: 1;
          width: min(100%, 1560px);
          margin-inline: auto;
        }
        .btc-login-header {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 48px;
        }
        .btc-brand-mark {
          display: grid;
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid rgba(34, 211, 238, .48);
          background: linear-gradient(145deg, rgba(34, 211, 238, .22), rgba(14, 53, 87, .42));
          box-shadow: 0 0 24px rgba(34, 211, 238, .17), inset 0 0 18px rgba(34, 211, 238, .08);
          color: var(--btc-cyan);
          clip-path: polygon(0 0, 78% 0, 100% 22%, 100% 100%, 22% 100%, 0 78%);
        }
        .btc-brand-name {
          color: #e7faff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .18em;
        }
        .btc-brand-tagline {
          margin-top: 5px;
          color: var(--btc-cyan);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .19em;
        }
        .btc-login-stage {
          display: grid;
          flex: 1;
          grid-template-columns: minmax(0, 1.5fr) minmax(360px, .9fr);
          align-items: center;
          gap: clamp(28px, 5vw, 84px);
          padding: 40px 0;
        }
        .btc-truck-side {
          position: relative;
          display: flex;
          min-height: 520px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .btc-fleet-badge {
          position: absolute;
          top: 7%;
          left: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 14px;
          border: 1px solid rgba(34, 211, 238, .28);
          background: rgba(5, 28, 46, .64);
          color: #b9f6ff;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .13em;
          clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
        }
        .btc-fleet-dot, .btc-status-dot {
          width: 7px;
          height: 7px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 12px rgba(74, 222, 128, .9);
        }
        .btc-truck-stage {
          position: relative;
          display: grid;
          width: min(100%, 660px);
          height: 330px;
          place-items: center;
          perspective: 900px;
        }
        .btc-truck-aura {
          position: absolute;
          right: 4%;
          bottom: 15px;
          left: 3%;
          height: 120px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(0, 172, 255, .29), rgba(0, 113, 255, .08) 42%, transparent 72%);
          filter: blur(13px);
        }
        .btc-truck-platform {
          position: absolute;
          right: 0;
          bottom: 32px;
          left: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(34, 211, 238, .75), rgba(34, 211, 238, .15), transparent);
          box-shadow: 0 0 18px rgba(34, 211, 238, .55);
        }
        .btc-truck {
          position: relative;
          display: flex;
          width: min(100%, 570px);
          height: 225px;
          align-items: flex-end;
          filter: drop-shadow(0 10px 26px rgba(0, 146, 255, .28));
        }
        .btc-truck-trailer {
          position: relative;
          width: 67%;
          height: 153px;
          border: 1px solid rgba(124, 226, 255, .88);
          border-radius: 8px 3px 4px 4px;
          background: linear-gradient(160deg, rgba(38, 138, 222, .88), rgba(9, 44, 92, .96) 73%);
          box-shadow: inset 0 0 26px rgba(74, 196, 255, .2), 0 0 22px rgba(0, 157, 255, .31);
          transform: skewY(-2deg);
        }
        .btc-truck-trailer::before {
          position: absolute;
          inset: 11px 12px;
          border: 1px solid rgba(137, 226, 255, .28);
          background: repeating-linear-gradient(90deg, transparent 0 38px, rgba(135, 218, 255, .12) 39px 40px);
          content: '';
        }
        .btc-truck-trailer::after {
          position: absolute;
          top: 0;
          right: 15px;
          bottom: 0;
          width: 2px;
          background: rgba(122, 223, 255, .45);
          box-shadow: 0 0 12px rgba(34, 211, 238, .8);
          content: '';
        }
        .btc-trailer-label {
          position: absolute;
          top: 50%;
          left: 50%;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #d8f9ff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .2em;
          text-shadow: 0 0 12px rgba(34, 211, 238, .7);
          transform: translate(-50%, -50%);
        }
        .btc-truck-cab {
          position: relative;
          width: 27%;
          height: 120px;
          margin-left: 2px;
          border: 1px solid rgba(136, 229, 255, .9);
          border-radius: 4px 28px 7px 4px;
          background: linear-gradient(145deg, #1685d9, #074076 72%);
          box-shadow: inset 0 0 22px rgba(76, 193, 255, .35), 0 0 25px rgba(0, 165, 255, .38);
          transform: skewY(-2deg);
        }
        .btc-truck-cab::before {
          position: absolute;
          top: 12px;
          right: 11px;
          left: 12px;
          height: 42px;
          border: 1px solid rgba(150, 235, 255, .74);
          border-radius: 2px 17px 2px 2px;
          background: linear-gradient(135deg, rgba(61, 216, 255, .76), rgba(6, 42, 85, .85));
          box-shadow: inset 0 0 16px rgba(97, 223, 255, .45);
          content: '';
        }
        .btc-truck-cab::after {
          position: absolute;
          right: -6px;
          bottom: 19px;
          width: 7px;
          height: 13px;
          border-radius: 0 5px 5px 0;
          background: #a5f3fc;
          box-shadow: 0 0 17px 5px rgba(34, 211, 238, .76);
          content: '';
        }
        .btc-truck-bumper {
          position: absolute;
          right: -7px;
          bottom: 5px;
          width: 23px;
          height: 7px;
          border: 1px solid #7cecff;
          border-radius: 4px;
          background: #8beaff;
          box-shadow: 0 0 22px 6px rgba(34, 211, 238, .55);
        }
        .btc-wheel {
          position: absolute;
          z-index: 2;
          bottom: -22px;
          width: 48px;
          height: 48px;
          border: 5px solid #0c2033;
          border-radius: 50%;
          background: radial-gradient(circle, #102f4a 0 27%, #42c5ef 29% 34%, #102237 38% 100%);
          box-shadow: 0 0 0 1px rgba(107, 221, 255, .64), 0 0 16px rgba(0, 151, 255, .48);
        }
        .btc-wheel-trailer { left: 24%; }
        .btc-wheel-rear { left: 57%; }
        .btc-wheel-cab { right: 7%; }
        .btc-truck-road {
          position: absolute;
          bottom: 13px;
          left: 2%;
          width: 27%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(34, 211, 238, .76), transparent);
          box-shadow: 0 0 10px rgba(34, 211, 238, .6);
        }
        .btc-truck-copy {
          align-self: flex-start;
          max-width: 520px;
          margin-top: 22px;
        }
        .btc-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #51e6ff;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .24em;
        }
        .btc-truck-copy h1 {
          margin: 13px 0 8px;
          color: #eafaff;
          font-size: clamp(28px, 3.1vw, 46px);
          font-weight: 700;
          letter-spacing: -.045em;
          line-height: 1.1;
        }
        .btc-truck-copy p {
          max-width: 420px;
          color: #87a8bd;
          font-size: 13px;
          line-height: 1.7;
        }
        .btc-login-card-frame {
          width: 100%;
          padding: 1px;
          background: linear-gradient(145deg, rgba(34, 211, 238, .66), rgba(34, 211, 238, .1) 35%, rgba(38, 127, 193, .42));
          box-shadow: 0 20px 80px rgba(0, 10, 24, .42), 0 0 38px rgba(34, 211, 238, .1);
          clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px));
        }
        .btc-login-card {
          padding: clamp(24px, 3vw, 38px);
          background: rgba(15, 35, 60, .86);
          backdrop-filter: blur(24px);
          clip-path: polygon(0 0, calc(100% - 21px) 0, 100% 21px, 100% 100%, 21px 100%, 0 calc(100% - 21px));
        }
        .btc-card-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 27px;
        }
        .btc-card-security {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #85a7bb;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .1em;
        }
        .btc-card-lock {
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border: 1px solid rgba(34, 211, 238, .25);
          color: var(--btc-cyan);
          background: rgba(34, 211, 238, .08);
        }
        .btc-login-card h2 {
          margin: 0;
          color: #f0fbff;
          font-size: 27px;
          font-weight: 800;
          letter-spacing: .08em;
        }
        .btc-card-subtitle {
          margin: 7px 0 23px;
          color: #88a9bd;
          font-size: 12px;
        }
        .btc-login-error {
          margin-bottom: 16px;
          padding: 11px 12px;
          border: 1px solid rgba(248, 113, 113, .36);
          background: rgba(127, 29, 29, .2);
          color: #fecaca;
          font-size: 12px;
          line-height: 1.5;
        }
        .btc-login-field {
          margin-bottom: 16px;
        }
        .btc-login-field label {
          display: block;
          margin-bottom: 8px;
          color: #c5dce8;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .04em;
        }
        .btc-input-wrap {
          display: flex;
          height: 47px;
          align-items: center;
          gap: 11px;
          padding: 0 13px;
          border: 1px solid rgba(129, 169, 194, .24);
          background: rgba(2, 14, 27, .56);
          color: #72dff4;
        }
        .btc-input-wrap:focus-within {
          border-color: rgba(34, 211, 238, .75);
          box-shadow: 0 0 0 3px rgba(34, 211, 238, .09), 0 0 20px rgba(34, 211, 238, .1);
        }
        .btc-input-wrap input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #effbff;
          font: inherit;
          font-size: 12px;
        }
        .btc-input-wrap input::placeholder {
          color: #64859b;
          opacity: 1;
        }
        .btc-input-wrap input:disabled {
          opacity: .65;
        }
        .btc-biometric {
          display: flex;
          min-height: 70px;
          align-items: center;
          gap: 13px;
          margin: 21px 0 18px;
          padding: 11px 13px;
          border: 1px solid rgba(34, 211, 238, .2);
          background: linear-gradient(90deg, rgba(34, 211, 238, .08), rgba(6, 26, 43, .25));
        }
        .btc-fingerprint {
          display: grid;
          width: 43px;
          height: 43px;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid rgba(34, 211, 238, .26);
          border-radius: 50%;
          color: var(--btc-cyan);
          background: rgba(34, 211, 238, .08);
        }
        .btc-biometric-copy strong {
          display: block;
          color: #baf6ff;
          font-size: 11px;
          font-weight: 700;
        }
        .btc-biometric-copy span {
          display: block;
          margin-top: 5px;
          color: #7898ac;
          font-size: 9px;
          letter-spacing: .1em;
        }
        .btc-match {
          margin-left: auto;
          color: #58e5a5;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }
        .btc-submit {
          display: flex;
          width: 100%;
          height: 48px;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 1px solid #67efff;
          background: #22d3ee;
          box-shadow: 0 0 23px rgba(34, 211, 238, .28), inset 0 0 15px rgba(255, 255, 255, .15);
          color: #03202c;
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .19em;
        }
        .btc-submit:hover:not(:disabled) {
          background: #67e8f9;
          box-shadow: 0 0 34px rgba(34, 211, 238, .48);
        }
        .btc-submit:disabled {
          cursor: wait;
          opacity: .8;
        }
        .btc-faceid {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 11px;
          padding: 10px;
          border: 1px solid rgba(100, 165, 197, .2);
          background: transparent;
          color: #a4c7d9;
          cursor: pointer;
          font: inherit;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .12em;
        }
        .btc-faceid:hover {
          border-color: rgba(34, 211, 238, .5);
          color: #d5faff;
        }
        .btc-card-links {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 7px 13px;
          margin: 22px 0 17px;
          color: #7292a7;
          font-size: 9px;
        }
        .btc-card-links a {
          color: inherit;
          text-decoration: none;
        }
        .btc-card-links a:hover {
          color: var(--btc-cyan);
        }
        .btc-card-links span {
          color: rgba(123, 165, 190, .4);
        }
        .btc-encryption {
          padding-top: 14px;
          border-top: 1px solid rgba(126, 167, 192, .14);
          color: #57768b;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .16em;
          text-align: center;
        }
        .btc-login-hud {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding-top: 13px;
          border-top: 1px solid rgba(74, 139, 174, .2);
          color: #6f91a6;
          font-size: 8px;
          font-weight: 600;
          letter-spacing: .09em;
        }
        .btc-hud-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btc-hud-group:last-child {
          text-align: right;
        }
        .btc-hud-label {
          color: #9cc0d3;
        }
        .btc-startup {
          position: fixed;
          z-index: 5;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 15px;
          background: radial-gradient(ellipse, rgba(0, 30, 52, .58), rgba(2, 11, 20, .9) 65%);
          color: #baf6ff;
          font-size: clamp(14px, 2vw, 20px);
          font-weight: 700;
          letter-spacing: .13em;
          text-align: center;
          text-shadow: 0 0 20px rgba(34, 211, 238, .7);
          pointer-events: none;
        }
        .btc-startup-icon {
          color: var(--btc-cyan);
          filter: drop-shadow(0 0 16px rgba(34, 211, 238, .8));
        }
        @media (max-width: 850px) {
          .btc-login-stage {
            grid-template-columns: minmax(0, 1fr) minmax(330px, .9fr);
            gap: 24px;
          }
          .btc-truck-side {
            min-height: 440px;
          }
          .btc-truck-stage {
            height: 260px;
          }
          .btc-truck {
            height: 180px;
          }
          .btc-truck-trailer {
            height: 125px;
          }
          .btc-truck-cab {
            height: 101px;
          }
          .btc-truck-copy p {
            font-size: 12px;
          }
          .btc-fleet-badge {
            font-size: 7px;
          }
          .btc-login-hud {
            font-size: 7px;
          }
        }
        @media (max-width: 680px) {
          .btc-login {
            padding: 18px 16px 14px;
          }
          .btc-login-header {
            gap: 10px;
          }
          .btc-brand-mark {
            width: 37px;
            height: 37px;
          }
          .btc-brand-name {
            font-size: 10px;
          }
          .btc-brand-tagline {
            font-size: 7px;
            letter-spacing: .11em;
          }
          .btc-login-stage {
            grid-template-columns: minmax(0, 1fr);
            gap: 4px;
            padding: 23px 0;
          }
          .btc-truck-side {
            min-height: 0;
          }
          .btc-fleet-badge {
            position: relative;
            top: auto;
            left: auto;
            align-self: flex-start;
            max-width: 100%;
            padding: 8px 10px;
            font-size: 7px;
          }
          .btc-truck-stage {
            height: 195px;
            margin-top: 8px;
          }
          .btc-truck {
            width: min(94%, 470px);
            height: 152px;
          }
          .btc-truck-trailer {
            height: 107px;
          }
          .btc-truck-cab {
            height: 88px;
          }
          .btc-wheel {
            bottom: -18px;
            width: 39px;
            height: 39px;
          }
          .btc-truck-copy {
            display: none;
          }
          .btc-login-card-frame {
            max-width: 480px;
            margin: 0 auto;
          }
          .btc-login-card {
            padding: 22px;
          }
          .btc-login-hud {
            align-items: flex-start;
            flex-direction: column;
            gap: 8px;
            line-height: 1.5;
          }
          .btc-hud-group:last-child {
            text-align: left;
          }
        }
        @media (max-width: 380px) {
          .btc-login-card {
            padding: 19px;
          }
          .btc-match {
            font-size: 8px;
          }
          .btc-biometric-copy strong {
            font-size: 10px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .btc-login *, .btc-login *::before, .btc-login *::after {
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <header className="btc-login-header">
        <div className="btc-brand-mark"><Truck size={22} strokeWidth={1.8} /></div>
        <div>
          <div className="btc-brand-name">BHARAT TRANSPORT COMPANY</div>
          <div className="btc-brand-tagline">SMART LOGISTICS • 2031 • QUANTUM SUPPLY CHAIN</div>
        </div>
      </header>

      <section className="btc-login-stage" aria-label="Secure fleet login">
        <div className="btc-truck-side">
          <div className="btc-fleet-badge">
            <span className="btc-fleet-dot" />
            {fleetStatus}
          </div>
          <div className="btc-truck-stage" aria-label="Electric cargo truck">
            <div className="btc-truck-aura" />
            <div className="btc-truck-platform" />
            <motion.div
              className="btc-truck"
              aria-hidden="true"
              animate={isLoggingIn
                ? { x: 2000, scale: 1.8, opacity: 0, filter: 'blur(12px)', boxShadow: '0 0 90px 45px rgba(34, 211, 238, .9)' }
                : { y: [0, -10, 0] }}
              transition={isLoggingIn
                ? { duration: 1.2, ease: 'easeIn' }
                : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="btc-truck-trailer">
                <div className="btc-trailer-label"><Zap size={13} /> BTC • E-CARGO</div>
              </div>
              <div className="btc-truck-cab"><span className="btc-truck-bumper" /></div>
              <span className="btc-wheel btc-wheel-trailer" />
              <span className="btc-wheel btc-wheel-rear" />
              <span className="btc-wheel btc-wheel-cab" />
            </motion.div>
            <div className="btc-truck-road" />
          </div>
          <div className="btc-truck-copy">
            <div className="btc-eyebrow"><Activity size={13} /> NEXT-GEN FREIGHT NETWORK</div>
            <h1>Every route.<br />In perfect motion.</h1>
            <p>Intelligent fleet operations, synchronized in real time across the Bharat Transport network.</p>
          </div>
        </div>

        <motion.div
          className="btc-login-card-frame"
          animate={isLoggingIn ? { opacity: 0, scale: 0.8, y: 100 } : { opacity: 1, scale: 1, y: 0 }}
          transition={isLoggingIn
            ? { duration: 0.8, ease: 'easeInOut' }
            : { duration: reduceMotion ? 0 : 0.45, ease: 'easeOut' }}
        >
          <div className="btc-login-card">
            <div className="btc-card-topline">
              <span className="btc-card-security"><ShieldCheck size={14} /> SECURE ACCESS • BIOMETRIC PROTECTED</span>
              <span className="btc-card-lock"><LockKeyhole size={16} /></span>
            </div>
            <h2>LOGIN</h2>
            <p className="btc-card-subtitle">Authenticate to your fleet command center.</p>

            {error && <div role="alert" className="btc-login-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="btc-login-field">
                <label htmlFor="login-email">Employee ID / Email</label>
                <div className="btc-input-wrap">
                  <Mail size={16} aria-hidden="true" />
                  <input
                    id="login-email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="employee@bharattransport.co.in"
                    autoComplete="username"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="btc-login-field">
                <label htmlFor="login-password">Password</label>
                <div className="btc-input-wrap">
                  <LockKeyhole size={16} aria-hidden="true" />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="btc-biometric">
                <motion.span
                  className="btc-fingerprint"
                  animate={reduceMotion ? undefined : { scale: [1, 1.08, 1], boxShadow: ['0 0 0 rgba(34, 211, 238, 0)', '0 0 20px rgba(34, 211, 238, .32)', '0 0 0 rgba(34, 211, 238, 0)'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Fingerprint size={23} />
                </motion.span>
                <div className="btc-biometric-copy">
                  <strong>Awaiting Fingerprint...</strong>
                  <span>BIOMETRIC SCAN READY</span>
                </div>
                <span className="btc-match">98.4% MATCH</span>
              </div>

              <button type="submit" disabled={loading} className="btc-submit">
                {loading ? 'AUTHENTICATING...' : 'LOGIN'}
                {!loading && <ArrowRight size={16} aria-hidden="true" />}
              </button>
              <button type="button" className="btc-faceid">
                <Fingerprint size={15} aria-hidden="true" />
                USE FACE ID SCAN
              </button>
            </form>

            <nav className="btc-card-links" aria-label="Account support">
              <a href="#reset-password">Reset Password</a><span>•</span>
              <a href="#register-user">Register New User</a><span>•</span>
              <a href="mailto:support@bharattransport.co.in">Help/Support</a>
            </nav>
            <div className="btc-encryption">QUANTUM ENCRYPTED • SECURE • BTCnet v2031.4</div>
          </div>
        </motion.div>
      </section>

      <footer className="btc-login-hud">
        <div className="btc-hud-group">
          <span className="btc-status-dot" />
          <span><span className="btc-hud-label">SYSTEM TIME:</span> 2031-06-14 22:18 IST • NODE: MUMBAI-HUB-09 • CONNECTION: SECURE</span>
        </div>
        <div className="btc-hud-group">
          <span><span className="btc-hud-label">FLEET STATUS:</span> 1,248 ACTIVE VEHICLES • 93% ON-TIME DELIVERY • CARGO TRACKING: LIVE</span>
        </div>
      </footer>

      {isLoggingIn && (
        <motion.div
          className="btc-startup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          aria-live="polite"
        >
          <motion.span
            className="btc-startup-icon"
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <Activity size={35} />
          </motion.span>
          <span>
            {'Initializing Fleet OS... Access Granted'.split('').map((character, index) => (
              <motion.span
                key={`${character}-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduceMotion ? 0 : index * 0.035 }}
              >
                {character}
              </motion.span>
            ))}
          </span>
        </motion.div>
      )}
    </main>
  )
}
