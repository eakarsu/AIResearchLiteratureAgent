import React, { useEffect, useRef, useState } from 'react';
const lbl={color:'#9ca3af',fontSize:11,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4};
const val={color:'#e5e7eb',fontSize:14,lineHeight:1.55,marginBottom:16,whiteSpace:'pre-wrap',wordBreak:'break-word'};

export default function DetailPanel({item,fields,onClose,onEdit,onDelete,children,isOpen,title}){
  const dialogRef=useRef(null),[confirming,setConfirming]=useState(false),open=isOpen!==false&&Boolean(item||children);
  useEffect(()=>{if(!open)return undefined;const previous=document.activeElement;const key=event=>{if(event.key==='Escape')onClose?.();};document.addEventListener('keydown',key);dialogRef.current?.focus();return()=>{document.removeEventListener('keydown',key);previous?.focus?.();};},[open,onClose]);
  if(!open)return null;
  return <div role="presentation" style={{position:'fixed',inset:0,zIndex:2000,display:'grid',placeItems:'center',padding:24,background:'rgba(8,12,28,.78)'}} onMouseDown={event=>{if(event.target===event.currentTarget)onClose?.();}}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="record-detail-title" tabIndex={-1} style={{width:'min(760px,100%)',maxHeight:'88vh',display:'flex',flexDirection:'column',background:'#16213e',border:'1px solid #31517f',borderRadius:14,boxShadow:'0 28px 90px rgba(0,0,0,.55)',outline:'none'}}>
      <header style={{padding:'18px 22px',borderBottom:'1px solid #29466f'}}><h2 id="record-detail-title" style={{color:'#f45b74',fontSize:19,margin:0}}>{title||item?.title||'Record details'}</h2></header>
      <div style={{padding:22,overflow:'auto'}}>
        {fields&&fields.map(field=>{const value=item?.[field.key];return value!==null&&value!==undefined&&value!==''?<div key={field.key}><div style={lbl}>{field.label}</div><div style={val}>{String(value)}</div></div>:null;})}
        {children}
      </div>
      <footer style={{padding:'16px 22px',borderTop:'1px solid #29466f',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
        <div>{confirming&&<span role="alert" style={{color:'#fecdd3',fontSize:13}}>Delete this record permanently?</span>}</div>
        <div style={{display:'flex',gap:9}}>
          <button type="button" onClick={onEdit||onClose} style={{background:'#31517f',color:'#fff',border:'none',borderRadius:7,padding:'9px 16px',cursor:'pointer'}}>Edit</button>
          {!confirming&&<button type="button" onClick={()=>onDelete?setConfirming(true):onClose?.()} style={{background:'#9f2940',color:'#fff',border:'none',borderRadius:7,padding:'9px 16px',cursor:'pointer'}}>Delete</button>}
          {onDelete&&confirming&&<button type="button" onClick={onDelete} style={{background:'#e94560',color:'#fff',border:'none',borderRadius:7,padding:'9px 16px',cursor:'pointer',fontWeight:600}}>Confirm delete</button>}
          <button type="button" onClick={()=>confirming?setConfirming(false):onClose?.()} style={{background:'#23324b',color:'#fff',border:'1px solid #475569',borderRadius:7,padding:'9px 16px',cursor:'pointer'}}>{confirming?'Keep record':'Cancel'}</button>
        </div>
      </footer>
    </section>
  </div>;
}
