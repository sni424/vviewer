import { Route, Routes } from 'react-router-dom';
import ViewerPage from "./ViewerPage";
import UploadPage from './UploadPage';


const MyRoutes = () => {
  return <Routes>
    <Route path="/" element={<ViewerPage />} />
    <Route path="/upload" element={<UploadPage />} />
    {/* <Route path="/landing" element={<Landing />} /> */}
    {/* <Route path="/about" element={<About />} /> */}
  </Routes>
}

function App() {


  return (

    <>
      <MyRoutes></MyRoutes>
    </>

  )
}

export default App
