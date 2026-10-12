import React, { useEffect, useRef } from 'react';

export default function Modal({ isOpen, onClose, onSave, title, children, saveLabel = 'Save', busy = false }) {
  const dialogRef = useRef(null);
  const open = isOpen !== false;
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKeyDown = event => { if (event.key === 'Escape' && !busy) onClose?.(); };
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus?.(); };
  }, [open, onClose, busy]);
  if (!open) return null;
  return <div role="presentation" style={{position:'fixed',inset:0,background:'rgba(8,12,28,.78)',display:'grid',placeItems:'center',padding:24,zIndex:2100}} onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose?.();}}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="native-modal-title" tabIndex={-1} style={{background:'#16213e',color:'#e0e0e0',borderRadius:14,width:'min(620px, 100%)',maxHeight:'88vh',overflow:'auto',border:'1px solid #31517f',boxShadow:'0 28px 90px rgba(0,0,0,.55)',outline:'none'}}>
      <header style={{padding:'18px 22px',borderBottom:'1px solid #29466f'}}><h2 id="native-modal-title" style={{color:'#f45b74',fontSize:19,margin:0}}>{title}</h2></header>
      <div style={{padding:22}}>{children}</div>
      <footer style={{padding:'16px 22px',borderTop:'1px solid #29466f',display:'flex',justifyContent:'flex-end',gap:10}}>
        <button type="button" onClick={onClose} disabled={busy} style={{padding:'9px 16px',background:'#23324b',color:'#f8fafc',border:'1px solid #475569',borderRadius:7,cursor:'pointer'}}>Cancel</button>
        {onSave&&<button type="button" onClick={onSave} disabled={busy} style={{padding:'9px 18px',background:'#e94560',color:'#fff',border:'none',borderRadius:7,cursor:'pointer',fontWeight:600}}>{busy?'Working…':saveLabel}</button>}
      </footer>
    </section>
  </div>;
}
