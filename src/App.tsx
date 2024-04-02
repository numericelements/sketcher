import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sketcher from './components/Sketcher';
import HomePage from './components/HomePage';

function App() {
  
  return (
    <div>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/sketcher" element={<Sketcher />}/>
    </Routes>
    </div>
  );
}

export default App;
