// frontend/src/App.jsx

import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import RuleBuilder from './components/RuleBuilder';

function App() {
  const linkStyle = "px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200";
  const activeLinkStyle = "bg-blue-600 text-white shadow-md";
  const inactiveLinkStyle = "text-gray-300 hover:bg-gray-700 hover:text-white";

  return (
    <div className="min-h-screen bg-[var(--bg-dark-primary)] text-[var(--text-primary)]">
      <nav className="bg-[var(--bg-dark-secondary)] border-b border-[var(--border-color)] shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            
            {/* NNTE Branding Section */}
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl text-white tracking-wider">NNTE</span>
                <span className="text-xs text-[var(--text-secondary)] hidden sm:block">Neural Network Traders Empire</span>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center space-x-4">
              <NavLink to="/" className={({ isActive }) => `${linkStyle} ${isActive ? activeLinkStyle : inactiveLinkStyle}`}>
                Dashboard
              </NavLink>
              <NavLink to="/builder" className={({ isActive }) => `${linkStyle} ${isActive ? activeLinkStyle : inactiveLinkStyle}`}>
                Rule Builder
              </NavLink>
            </div>
          </div>
        </div>
      </nav>
      
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/builder" element={<RuleBuilder />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;