import Link from 'next/link';

export default function Footer(){
  return (
    <footer className="site-footer">
      <div className="container-mobile">
        <div className="row" style={{justifyContent:'space-between', alignItems:'flex-start'}}>
          <div style={{maxWidth:360}}>
            <h3 style={{color:'#fff', marginBottom:8}}>IranConnect</h3>
            <p className="text-muted" style={{color:'rgba(255,255,255,0.85)'}}>Connecting Iranians abroad with clients back home. Services and products from Iranian businesses in Nice.</p>
          </div>
          <div>
            <h4 style={{color:'#fff'}}>Quick links</h4>
            <div className="col">
              <Link href="/">Home</Link>
              <Link href="/auth/login">Login</Link>
              <Link href="/admin">Admin</Link>
            </div>
          </div>
        </div>
        <div style={{marginTop:20, textAlign:'center', color:'rgba(255,255,255,0.7)'}}>© {2025} IranConnect</div>
      </div>
    </footer>
  );
}
