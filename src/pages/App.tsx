import { Route, Routes } from 'react-router-dom';
import ViewerPage from "./ViewerPage";
import UploadPage from './UploadPage';
import AtomProvider from '../components/AtomProvider';
import { Env, envAtom, useEnvParams } from '../scripts/atoms';
import { useEffect, useState } from 'react';
import { get } from 'idb-keyval';
import TestPage from './TestPage';


const MyRoutes = () => {
  return <Routes>
    <Route path="/" element={<ViewerPage />} />
    <Route path="/upload" element={<UploadPage />} />
    <Route path="/test" element={<TestPage />} />
    {/* <Route path="/about" element={<About />} /> */}
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
