// Main App Component with Routing
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import Dashboard from './pages/Dashboard';
import AddQuestion from './pages/AddQuestion';
import Questions from './pages/Questions';
import Practice from './pages/Practice';
import PracticeSession from './pages/PracticeSession';
import Analytics from './pages/Analytics';
import Import from './pages/Import';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="add" element={<AddQuestion />} />
          <Route path="questions" element={<Questions />} />
          <Route path="practice" element={<Practice />} />
          <Route path="practice/:sessionId" element={<PracticeSession />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="import" element={<Import />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
