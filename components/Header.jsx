import Link from 'next/link';

export default function Header(){ 
  return (
    <header className="site-header">
      <div className="container-mobile flex items-center justify-between py-4">
        <div className="brand">
          <Link href="/">
            <img src="/logo.png" alt="IranConnect logo" width="64" height="64" className="biz-logo" style={{objectFit:'contain'}} />
          </Link>
          <div style={{marginLeft:8}}>
            <div style={{fontWeight:700, color:'var(--navy)'}}>IranConnect</div>
            <div className="text-muted text-sm">Iranian services in Nice, France</div>
          </div>
        </div>

        <nav className="flex gap-4 items-center">
          <Link href="/auth/login" className="nav-link">Login</Link>
          <Link href="/auth/register" className="nav-link">Register</Link>
          <Link href="/admin" className="nav-link">Admin</Link>
        </nav>
      </div>
    </header>
  );
}
