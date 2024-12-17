import { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { useEnvParams } from '../scripts/atoms';
import MobilePage from './MobilePage';
import TestPage from './TestPage';
import { loadSettings, saveSettings } from './useSettings';
import ViewerPage from './ViewerPage';

const MyRoutes = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth < 600) {
        navigate('/mobile');
      }
    };
    checkWidth();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<ViewerPage />} />
      {/* <Route path="/upload" element={<UploadPage />} /> */}
      <Route path="/test" element={<TestPage />} />
      <Route path="/mobile" element={<MobilePage />} />
    </Routes>
  );
};

function App() {
  const [_, setEnv] = useEnvParams();
  useEffect(() => {
    loadSettings();

    const settingSaver = () => {
      console.log('here');
      saveSettings();
    };

    addEventListener('beforeunload', settingSaver);
    return () => {
      removeEventListener('beforeunload', settingSaver);
    };
  }, []);

  return (
    <>
      <MyRoutes></MyRoutes>
    </>
  );
}

export default App;
