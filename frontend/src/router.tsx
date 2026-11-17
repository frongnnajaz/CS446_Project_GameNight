// เส้นทางทั้งหมดของแอป (React Router v7 แบบ Data Router)
import { createBrowserRouter } from 'react-router'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import GameDetail from './pages/GameDetail'
import Collection from './pages/Collection'
import Picker from './pages/Picker'
import About from './pages/About'
import Admin from './pages/Admin'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import RouteError from './pages/RouteError'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />, // กรณี layout เองพัง
    children: [
      {
        // error ในหน้าลูกแสดงภายใน layout (Navbar/Footer ยังอยู่)
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Home /> },
          { path: 'game/:id', element: <GameDetail /> }, // Dynamic Route
          { path: 'collection', element: <Collection /> },
          { path: 'picker', element: <Picker /> },
          { path: 'login', element: <Login /> },
          { path: 'admin', element: <Admin /> }, // จัดการข้อมูล (CRUD)
          { path: 'about', element: <About /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
])
