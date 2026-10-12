import React,{useEffect,useState}from'react';
import{BrowserRouter}from'react-router-dom';
import Sidebar from'./components/Sidebar';
import ResearchWorkspace from'./components/ResearchWorkspace';
import LoginPage from'./pages/LoginPage';
import DashboardPage from'./pages/DashboardPage';
import PapersPage from'./pages/PapersPage';
import CollectionsPage from'./pages/CollectionsPage';
import ReviewsPage from'./pages/ReviewsPage';
import AgentsPage from'./pages/AgentsPage';
import NewAgentsPage from'./pages/NewAgentsPage';
import CustomViewsPage from'./pages/CustomViewsPage';

const workspacePages={
  'gap-arxiv':'arxiv-search','gap-bibtex':'bibtex-export','gap-citation-network':'citation-network','gap-gapfinder':'gap-finder','gap-highlight':'highlight-annotation','gap-lit-review':'literature-review','gap-methodology':'methodology','gap-notifications':'notifications','gap-recommender':'recommender','gap-summarizer':'summarizer','gap-pdf':'pdf-ingestion','gap-quality':'quality-scoring','gap-collab':'collaboration',
};
export default function App(){
  const[loggedIn,setLoggedIn]=useState(Boolean(localStorage.getItem('token')));
  const initialPage=typeof window!=='undefined'&&window.location.pathname==='/custom-views'?'custom-views':'dashboard';
  const[page,setPage]=useState(initialPage);
  useEffect(()=>{if(typeof window==='undefined')return undefined;const handler=()=>setPage(window.location.pathname==='/custom-views'?'custom-views':'dashboard');window.addEventListener('popstate',handler);return()=>window.removeEventListener('popstate',handler);},[]);
  const navigate=key=>{setPage(key);if(typeof window!=='undefined')window.history.pushState({},'',key==='custom-views'?'/custom-views':'/');};
  if(!loggedIn)return <LoginPage onLogin={()=>setLoggedIn(true)}/>;
  const pages={dashboard:<DashboardPage onNavigate={navigate}/>,papers:<PapersPage/>,collections:<CollectionsPage/>,reviews:<ReviewsPage/>,agents:<AgentsPage/>,'new-agents':<NewAgentsPage/>,'custom-views':<CustomViewsPage/>};
  const content=pages[page]||(workspacePages[page]?<ResearchWorkspace feature={workspacePages[page]}/>:pages.dashboard);
  return <BrowserRouter><div style={{display:'flex',minHeight:'100vh',background:'#1a1a2e'}}><Sidebar active={page} onNavigate={navigate}/><main style={{marginLeft:240,padding:30,flex:1,minWidth:0}}>{content}</main></div></BrowserRouter>;
}
