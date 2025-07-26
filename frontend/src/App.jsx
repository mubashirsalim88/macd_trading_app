// frontend/src/App.jsx
import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import RuleBuilder from './components/RuleBuilder';

function App() {
  const linkStyle = "px-3 py-2 rounded-md text-sm font-medium";
  const activeLinkStyle = "bg-gray-900 text-white";
  const inactiveLinkStyle = "text-gray-300 hover:bg-gray-700 hover:text-white";

  return (
    <div>
      <nav className="bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-start h-16">
            <NavLink to="/" className={({ isActive }) => `${linkStyle} ${isActive ? activeLinkStyle : inactiveLinkStyle}`}>
              Dashboard
            </NavLink>
            <NavLink to="/builder" className={({ isActive }) => `${linkStyle} ${isActive ? activeLinkStyle : inactiveLinkStyle}`}>
              Rule Builder
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="bg-gray-100 min-h-screen">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/builder" element={<RuleBuilder />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;