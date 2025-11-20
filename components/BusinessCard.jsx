import Link from 'next/link';

export default function BusinessCard({ b }){
  return (
    <Link href={`/business/${b.id}`} className="block">
      <div className="biz-card">
        <div className="row">
          <img src={b.logo_url || '/logo.png'} alt={`${b.name} logo`} width={64} height={64} className="biz-logo" style={{borderRadius:10}} />
          <div style={{flex:1}}>
            <div style={{color:'var(--navy)', fontWeight:700}}>{b.name}</div>
            <div className="text-muted text-sm">{b.category} • {b.city}</div>
          </div>
          <div style={{fontWeight:600}}>⭐ {b.avg_rating ?? '—'}</div>
        </div>
      </div>
    </Link>
  );
}
