import React,{useEffect,useState}from'react';
import{getCollections,createCollection,updateCollection,deleteCollection}from'../services/api';
import Modal from'../components/Modal';
import DetailPanel from'../components/DetailPanel';

const inputStyle={width:'100%',padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff',boxSizing:'border-box'};
const emptyForm={name:'',description:''};
export default function CollectionsPage(){
  const[items,setItems]=useState([]),[selected,setSelected]=useState(null),[showModal,setShowModal]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(emptyForm),[loading,setLoading]=useState(true),[error,setError]=useState(''),[actionError,setActionError]=useState(''),[busy,setBusy]=useState(false);
  const load=async()=>{setLoading(true);setError('');try{const rows=await getCollections();if(!Array.isArray(rows))throw Error('Collections returned an invalid response.');setItems(rows);}catch(err){setItems([]);setError(err.message||'Could not load collections.');}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const openNew=()=>{setEditing(null);setForm({...emptyForm});setActionError('');setShowModal(true);};
  const openEdit=item=>{setEditing(item);setForm({name:item.name||'',description:item.description||''});setSelected(null);setActionError('');setShowModal(true);};
  const closeModal=()=>{setShowModal(false);setEditing(null);setForm({...emptyForm});setActionError('');};
  const save=async()=>{if(!form.name.trim()){setActionError('Collection name is required.');return;}setBusy(true);setActionError('');try{if(editing?.id)await updateCollection(editing.id,form);else await createCollection(form);closeModal();await load();}catch(err){setActionError(err.message||'Could not save the collection.');}finally{setBusy(false);}};
  const remove=async()=>{if(!selected)return;setBusy(true);setActionError('');try{await deleteCollection(selected.id);setSelected(null);await load();}catch(err){setActionError(err.message||'Could not delete the collection.');}finally{setBusy(false);}};
  const colors=['#3498db','#2ecc71','#e94560','#f39c12','#9b59b6'];

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><div><h1 style={{color:'#fff',margin:0}}>Collections ({items.length})</h1><p style={{color:'#94a3b8',fontSize:13}}>Only collections owned by this research account are shown.</p></div><button type="button" onClick={openNew} style={{padding:'10px 20px',background:'#e94560',color:'#fff',border:'none',borderRadius:6,cursor:'pointer'}}>+ New Collection</button></div>
    {loading&&<p role="status" style={{color:'#cbd5e1'}}>Loading collections…</p>}
    {error&&<div role="alert" style={{color:'#fecdd3',padding:14,border:'1px solid #e94560',borderRadius:8}}>{error} <button type="button" onClick={load}>Retry collections</button></div>}
    {actionError&&!showModal&&<p role="alert" style={{color:'#fecdd3'}}>{actionError}</p>}
    {!loading&&!error&&!items.length&&<p style={{color:'#aab5c8'}}>No account-owned collections are available.</p>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))',gap:16}}>{items.map((item,index)=><button type="button" key={item.id} onClick={()=>{setSelected(item);setActionError('');}} style={{background:'#16213e',padding:24,borderRadius:12,border:'none',borderTop:`4px solid ${colors[index%colors.length]}`,textAlign:'left',cursor:'pointer'}}><h3 style={{color:'#fff',margin:'0 0 8px'}}>{item.name}</h3><p style={{color:'#aab5c8',fontSize:13,minHeight:38}}>{item.description}</p><span style={{color:'#3498db',fontSize:14}}>{item.paper_count||0} saved papers</span></button>)}</div>
    {selected&&<DetailPanel item={{...selected,title:selected.name}} title={selected.name} onClose={()=>setSelected(null)} onEdit={()=>openEdit(selected)} onDelete={remove} fields={[{key:'description',label:'Description'},{key:'paper_count',label:'Saved papers'},{key:'created_at',label:'Created'}]}/>}
    {showModal&&<Modal title={editing?'Edit Collection':'New Collection'} onClose={closeModal} onSave={save} busy={busy}><div style={{marginBottom:14}}><label htmlFor="collection-name">Name</label><input id="collection-name" value={form.name} onChange={event=>setForm({...form,name:event.target.value})} style={inputStyle}/></div><div style={{marginBottom:14}}><label htmlFor="collection-description">Description</label><textarea id="collection-description" rows={5} value={form.description} onChange={event=>setForm({...form,description:event.target.value})} style={inputStyle}/></div>{actionError&&<p role="alert" style={{color:'#fecdd3'}}>{actionError}</p>}</Modal>}
  </div>;
}
