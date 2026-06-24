import { GraduationCap } from 'lucide-react'

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <GraduationCap size={28} color="#0a9396" strokeWidth={1.5} />
      <span
        style={{
          fontSize: '1.4rem',
          fontWeight: '700',
          letterSpacing: '0.05em',
          background: 'linear-gradient(to right, #0a9396, #5ec4c6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Stride
      </span>
    </div>
  )
}

export default Logo