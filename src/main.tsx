import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom'
import { DEMO } from './lib/env'
import './index.css'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Parcels from './pages/Parcels'
import ParcelDetail from './pages/ParcelDetail'
import Sprays from './pages/Sprays'
import SprayForm from './pages/SprayForm'
import SprayPrint from './pages/SprayPrint'
import Products from './pages/Products'
import Stock from './pages/Stock'
import Work from './pages/Work'
import Harvests from './pages/Harvests'
import Settings from './pages/Settings'
import Home from './pages/Home'
import Search from './pages/Search'
import Varieties from './pages/Varieties'
import VarietyDetail from './pages/VarietyDetail'
import { ArticlePage, Articles, Forum, ForumCategory, ForumThread, Help } from './pages/Community'

try {
  const t = localStorage.getItem('theme')
  if (t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark')
} catch {}

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false } } })

const router = (DEMO ? createHashRouter : createBrowserRouter)([
  { path: '/permetezes/nyomtatas', element: <SprayPrint /> },
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/kereses', element: <Search /> },
      { path: '/szolok', element: <Varieties /> },
      { path: '/szolo/:id', element: <VarietyDetail /> },
      { path: '/cikkek', element: <Articles /> },
      { path: '/cikkek/:slug', element: <ArticlePage /> },
      { path: '/forum', element: <Forum /> },
      { path: '/forum/:cat', element: <ForumCategory /> },
      { path: '/forum/:cat/:id', element: <ForumThread /> },
      { path: '/segitseg', element: <Help /> },
      { path: '/kertem', element: <Dashboard /> },
      { path: '/szoloim', element: <Parcels /> },
      { path: '/szoloim/:id', element: <ParcelDetail /> },
      { path: '/permetezes', element: <Sprays /> },
      { path: '/permetezes/uj', element: <SprayForm /> },
      { path: '/permetezes/:id', element: <SprayForm /> },
      { path: '/szerek', element: <Products /> },
      { path: '/raktar', element: <Stock /> },
      { path: '/munkanaplo', element: <Work /> },
      { path: '/szuret', element: <Harvests /> },
      { path: '/beallitasok', element: <Settings /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
