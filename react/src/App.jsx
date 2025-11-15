import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Game from './components/Game';
import './App.css';

function App() {
  useEffect(() => {
    const routes = ['/', '/game'];
    if (typeof window !== 'undefined' && typeof window.handleRoutes === 'function') {
      window.handleRoutes(routes);
    }
  }, []);

  return (
    <div className="app" data-easytag="id1-react/src/App.jsx">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game" element={<Game />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
