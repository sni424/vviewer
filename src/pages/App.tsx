import { Route, Routes, useNavigate } from 'react-router-dom';
import ViewerPage from "./ViewerPage";
import { Env, useEnvParams } from '../scripts/atoms';
import { useEffect } from 'react';
import { get } from 'idb-keyval';
import TestPage from './TestPage';
import MobilePage from './MobilePage';


const MyRoutes = () => {
  // if width less than 800, route to "/mobile"
  const navigate = useNavigate();

  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth < 800) {
        navigate("/mobile");
      }
    }
    // checkWidth();
  }, [

  ]);



  return <Routes>
    <Route path="/" element={<ViewerPage />} />
    {/* <Route path="/upload" element={<UploadPage />} /> */}
    <Route path="/test" element={<TestPage />} />
    <Route path="/mobile" element={<MobilePage />} />
  </Routes>
}

function App() {
  const [_, setEnv] = useEnvParams();
  useEffect(() => {
    get("envParam").then((env: Env | undefined) => {
      if (env) {
        setEnv(env);
      }
    })
  }, [

  ]);

  return (

    <>
      <MyRoutes></MyRoutes>
    </>

  )
}

export default App
