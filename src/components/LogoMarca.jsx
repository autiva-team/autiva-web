export default function LogoMarca({ pequeno = false }) {
  return <span className={pequeno ? 'brand-mark brand-mark--sm' : 'brand-mark'} aria-hidden="true"><img src="/logo-autiva.png" alt="" width="128" height="128" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'inherit', display: 'block' }} /></span>
}
