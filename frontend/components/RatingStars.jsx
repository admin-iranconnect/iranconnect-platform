import { useState } from 'react';

export default function RatingStars({ value=0, onChange }){
  const [v, setV] = useState(value);
  function setRating(n){ setV(n); if(onChange) onChange(n); }
  return (
    <div className="flex gap-2">
      {[1,2,3,4,5].map(n=> (
        <button key={n} onClick={()=>setRating(n)} className="text-2xl leading-none" aria-label={`Rate ${n}`}>
          <span className={n <= v ? 'text-[var(--turquoise)]' : 'text-muted'}>★</span>
        </button>
      ))}
    </div>
  );
}
