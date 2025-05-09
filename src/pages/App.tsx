import { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { useRegion } from 'src/scripts/useRegion';
import { useEnvParams } from '../scripts/atoms';
import MobilePage from './MobilePage';
import TestPage from './TestPage';
import { loadSettings, saveSettings } from './useSettings';
import ViewerPage from './ViewerPage';

const MyRoutes = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // url path from host
    const urlpath = window.location.pathname.split('/')[1];
    console.log('urlpath', urlpath);
    if (urlpath.trim() !== '') {
      navigate('/' + urlpath);
    } else {
      const checkWidth = () => {
        if (window.innerWidth < 600) {
          navigate('/test');
        }
      };
      checkWidth();
    }
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

function AppWithRegion() {
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

function App() {
  const region = useRegion();

  if (region !== 'unknown') {
    // console.log(region, ENV.base);

    return <AppWithRegion />;
  }

  return null;
}

export default App;
