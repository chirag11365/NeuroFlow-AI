import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from './store/auth.js';
import { AppShell, Dashboard, Login, Register, Workspaces, WorkspacePage, RunPage } from './pages/index.jsx';

function Guard({ children, publicOnly = false }) {
  const token = useAuth((state) => state.token);
  if (publicOnly && token) return <Navigate to="/" replace/>;
  if (!publicOnly && !token) return <Navigate to="/login" replace/>;
  return children;
}
export const router = createBrowserRouter([
  { path: '/login', element: <Guard publicOnly><Login/></Guard> },
  { path: '/register', element: <Guard publicOnly><Register/></Guard> },
  { path: '/', element: <Guard><AppShell/></Guard>, children: [
    { index: true, element: <Dashboard/> }, { path: 'workspaces', element: <Workspaces/> },
    { path: 'workspaces/:workspaceId', element: <WorkspacePage/> }, { path: 'runs/:runId', element: <RunPage/> }
  ] }
]);
