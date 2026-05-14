import React from 'react';
const lbl={color:'#888',fontSize:11,textTransform:'uppercase',marginBottom:2};const val={color:'#e0e0e0',fontSize:13,marginBottom:12,wordBreak:'break-word'};
export default function DetailPanel({item,fields,onClose,onEdit,onDelete,children,isOpen,title}){
// Support both usage patterns
if(isOpen!==undefined&&!isOpen)return null;
if(!item&&!children)return null;
return(<div style={{position:'fixed',top:0,right:0,width:460,height:'100vh',background:'#16213e',borderLeft:'2px solid #0f3460',zIndex:999,overflow:'auto',boxShadow:'-5px 0 20px rgba(0,0,0,0.5)'}}>
<div style={{padding:16,borderBottom:'1px solid #0f3460',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'#16213e'}}>
<h2 style={{color:'#e94560',fontSize:16,margin:0}}>{title||item?.title||'Detail'}</h2>
<div style={{display:'flex',gap:8,alignItems:'center'}}>
{onEdit&&<button onClick={onEdit} style={{background:'#0f3460',color:'#ccc',border:'none',borderRadius:4,padding:'4px 10px',cursor:'pointer'}}>Edit</button>}
{onDelete&&<button onClick={()=>{if(window.confirm('Delete?'))onDelete();}} style={{background:'#e94560',color:'#fff',border:'none',borderRadius:4,padding:'4px 10px',cursor:'pointer'}}>Delete</button>}
<span onClick={onClose} style={{cursor:'pointer',color:'#a0a0b0',fontSize:22,lineHeight:1}}>&times;</span>
</div></div>
<div style={{padding:20}}>
{fields&&fields.map(f=>{const v=item?.[f.key];return v!=null?(<div key={f.key}><div style={lbl}>{f.label}</div><div style={val}>{String(v)}</div></div>):null;})}
{children}
</div></div>);
}
