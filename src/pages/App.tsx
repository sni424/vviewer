import { Route, Routes, useNavigate } from 'react-router-dom';
import ViewerPage from './ViewerPage';
import { Env, useEnvParams } from '../scripts/atoms';
import { useEffect } from 'react';
import { get } from 'idb-keyval';
import TestPage from './TestPage';
import MobilePage from './MobilePage';
import { loadSettings, saveSettings } from './useSettings';

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
