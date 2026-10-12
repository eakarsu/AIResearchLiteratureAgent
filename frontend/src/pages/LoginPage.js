import React, { useRef, useState } from 'react';
import { login, loginDemo } from '../services/api';

const inputStyle={width:'100%',padding:12,marginBottom:12,background:'#101a30',border:'1px solid #31517f',borderRadius:7,color:'#fff',boxSizing:'border-box'};
export default function LoginPage({onLogin}){
  const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState('');
  const locked=useRef(false);
  const complete=session=>{if(!session?.token)throw new Error('The server did not create a session.');localStorage.setItem('token',session.token);onLogin();};
  const submit=async event=>{event.preventDefault();if(locked.current)return;locked.current=true;setBusy('login');setError('');try{complete(await login(email,password));}catch(err){setError(err.message||'Login failed.');}finally{locked.current=false;setBusy('');}};
  const demo=async()=>{if(locked.current)return;locked.current=true;setBusy('demo');setError('');try{complete(await loginDemo());}catch(err){setError(err.message||'Demo login failed.');}finally{locked.current=false;setBusy('');}};
  return <main style={{minHeight:'100vh',background:'#1a1a2e',display:'grid',placeItems:'center',padding:24}}><section aria-labelledby="login-title" style={{background:'#16213e',padding:40,borderRadius:14,width:'min(420px,100%)',border:'1px solid #29466f',boxShadow:'0 24px 80px rgba(0,0,0,.35)'}}>
    <h1 id="login-title" style={{color:'#f45b74',textAlign:'center',marginBottom:8}}>📚 Research Literature Agent</h1><p style={{color:'#aab5c8',textAlign:'center',marginBottom:26,fontSize:14}}>Evidence-aware literature workflows</p>
    {error&&<div role="alert" style={{background:'#e9456020',border:'1px solid #e94560',color:'#fecdd3',padding:11,borderRadius:7,marginBottom:16}}>{error}</div>}
    <form onSubmit={submit}><label htmlFor="login-email" style={{display:'block',marginBottom:5}}>Email</label><input id="login-email" required value={email} onChange={event=>setEmail(event.target.value)} type="email" autoComplete="username" style={inputStyle}/><label htmlFor="login-password" style={{display:'block',marginBottom:5}}>Password</label><input id="login-password" required value={password} onChange={event=>setPassword(event.target.value)} type="password" autoComplete="current-password" style={{...inputStyle,marginBottom:20}}/><button type="submit" disabled={Boolean(busy)} style={{width:'100%',padding:12,background:'#e94560',color:'#fff',border:0,borderRadius:7,fontSize:16,cursor:'pointer',marginBottom:12}}>{busy==='login'?'Signing in…':'Login'}</button></form>
    <button type="button" disabled={Boolean(busy)} onClick={demo} style={{width:'100%',padding:11,background:'#0f3460',color:'#fff',border:'1px solid #5c7eb0',borderRadius:7,cursor:'pointer',fontSize:14,fontWeight:600}}>{busy==='demo'?'Opening demo…':'Open Demo Workspace'}</button>
    <p style={{color:'#94a3b8',fontSize:12,lineHeight:1.5,margin:'14px 0 0'}}>Demo access uses the configured training account. No password is exposed or copied into this page.</p>
  </section></main>;
}
