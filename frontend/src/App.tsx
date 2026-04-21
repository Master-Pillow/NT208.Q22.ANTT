import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { Dashboard } from './views/Dashboard';
import { StudentProfiles } from './views/StudentProfiles';
import { CohortDetails } from './views/CohortDetails';
import { Schedule } from './views/Schedule';
import { LogNotes } from './views/LogNotes';
import { Messages } from './views/Messages';
import { ClassList } from './views/ClassList';
import { AdvisorProfile } from './views/AdvisorProfile';
import { Login } from './views/Login';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  
  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex antialiased selection:bg-primary/20 selection:text-primary">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-grow lg:ml-[280px] flex flex-col min-h-screen relative overflow-hidden bg-surface">
        <Toolbar setCurrentView={setCurrentView} onLogout={() => setIsAuthenticated(false)} />
        <div className="flex-1 overflow-y-auto w-full pt-32 px-6 sm:px-10 pb-12">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'profiles' && <StudentProfiles onNavigate={setCurrentView} />}
          {currentView === 'cohort' && <CohortDetails onNavigate={setCurrentView} />}
          {currentView === 'classlist' && <ClassList onNavigate={setCurrentView} />}
          {currentView === 'schedule' && <Schedule />}
          {currentView === 'notes' && <LogNotes />}
          {currentView === 'messages' && <Messages />}
          {currentView === 'profile' && <AdvisorProfile />}
        </div>
      </main>
    </div>
  );
}
