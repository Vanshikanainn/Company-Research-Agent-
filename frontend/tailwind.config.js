/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0066FF',
        accent: '#667EEA',
        secondary: '#764BA2',
        background: '#FFFFFF',
        foreground: '#1E293B',
        muted: {
          foreground: '#64748B',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1E293B',
        },
        border: '#E5E7EB',
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 102, 255, 0.3)',
        'glow-purple': '0 4px 16px rgba(102, 126, 234, 0.3)',
        'glow-red': '0 4px 12px rgba(239, 68, 68, 0.2)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0066FF 0%, #0052CC 50%, #003D99 100%)',
        'gradient-blue': 'linear-gradient(135deg, #0066FF 0%, #4A90E2 100%)',
        'gradient-header': 'linear-gradient(135deg, #0066FF 0%, #0052CC 50%, #003D99 100%)',
        'gradient-app': 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%, #f8fafc 100%)',
        'gradient-messages': 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 50%, rgba(235, 242, 250, 0.8) 100%)',
        'gradient-red': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        'gradient-gray': 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-in': 'messageSlideIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'bounce-dot': 'bounce 1.4s infinite ease-in-out both',
        'recording-pulse': 'recordingPulse 1.5s ease-in-out infinite',
        'recording-glow': 'recordingGlow 2s ease-in-out infinite alternate',
        'error-shake': 'errorShake 0.5s ease-in-out',
        'slide-in-left': 'slideInLeft 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'bounce-in': 'bounceIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-in-right': 'slideInRight 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        messageSlideIn: {
          'from': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          'to': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        bounce: {
          '0%, 80%, 100%': { transform: 'scale(0)', opacity: '0.5' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        recordingPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        recordingGlow: {
          'from': { boxShadow: '0 0 20px rgba(102, 126, 234, 0.1)' },
          'to': { boxShadow: '0 0 30px rgba(102, 126, 234, 0.2)' },
        },
        errorShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        slideInLeft: {
          'from': { transform: 'translateX(-100%)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeInUp: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0) rotate(-180deg)', opacity: '0' },
          '50%': { transform: 'scale(1.2) rotate(0deg)', opacity: '0.8' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        slideInRight: {
          'from': { transform: 'translateX(-30px)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

