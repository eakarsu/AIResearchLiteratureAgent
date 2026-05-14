import React, { useState } from 'react'; import { BrowserRouter } from 'react-router-dom';
import Sidebar from './components/Sidebar'; import LoginPage from './pages/LoginPage'; import DashboardPage from './pages/DashboardPage';
import PapersPage from './pages/PapersPage'; import CollectionsPage from './pages/CollectionsPage';
import ReviewsPage from './pages/ReviewsPage'; import AgentsPage from './pages/AgentsPage';
import NewAgentsPage from './pages/NewAgentsPage';
function App() { const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token')); const [page, setPage] = useState('dashboard');
  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;
  const pages = { dashboard: <DashboardPage onNavigate={setPage} />, papers: <PapersPage />, collections: <CollectionsPage />, reviews: <ReviewsPage />, agents: <AgentsPage />, 'new-agents': <NewAgentsPage /> };
  return (<BrowserRouter><div style={{ display: 'flex', minHeight: '100vh', background: '#1a1a2e' }}><Sidebar active={page} onNavigate={setPage} /><div style={{ marginLeft: 240, padding: 30, flex: 1 }}>{pages[page] || pages.dashboard}</div></div></BrowserRouter>);
}
export default App;
