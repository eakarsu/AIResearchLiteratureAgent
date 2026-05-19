import React, { useState, useEffect } from 'react'; import { BrowserRouter } from 'react-router-dom';
import Sidebar from './components/Sidebar'; import LoginPage from './pages/LoginPage'; import DashboardPage from './pages/DashboardPage';
import PapersPage from './pages/PapersPage'; import CollectionsPage from './pages/CollectionsPage';
import ReviewsPage from './pages/ReviewsPage'; import AgentsPage from './pages/AgentsPage';
import NewAgentsPage from './pages/NewAgentsPage';
import CustomViewsPage from './pages/CustomViewsPage';
function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));
  const initialPage = (typeof window !== 'undefined' && window.location.pathname === '/custom-views') ? 'custom-views' : 'dashboard';
  const [page, setPage] = useState(initialPage);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      if (window.location.pathname === '/custom-views') setPage('custom-views');
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  const navigate = (key) => {
    setPage(key);
    if (typeof window !== 'undefined') {
      const path = key === 'custom-views' ? '/custom-views' : '/';
      window.history.pushState({}, '', path);
    }
  };
  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;
  const pages = { dashboard: <DashboardPage onNavigate={navigate} />, papers: <PapersPage />, collections: <CollectionsPage />, reviews: <ReviewsPage />, agents: <AgentsPage />, 'new-agents': <NewAgentsPage />, 'custom-views': <CustomViewsPage /> };
  return (<BrowserRouter><div style={{ display: 'flex', minHeight: '100vh', background: '#1a1a2e' }}><Sidebar active={page} onNavigate={navigate} /><div style={{ marginLeft: 240, padding: 30, flex: 1 }}>{pages[page] || pages.dashboard}</div></div></BrowserRouter>);
}
export default App;
