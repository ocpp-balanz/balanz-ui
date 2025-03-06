import { useState, useMemo, useEffect } from 'react';
import { Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { Container } from '@mui/material';
import ResponsiveAppBar from './components/ResponsiveAppBar';
import BalanzAPI from './services/balanz_api';
import Loader from './common/Loader';
import Chargers from './pages/Chargers';
import Groups from './pages/Groups';
import Tags from './pages/Tags';
import Dashboard from './pages/Dashboard';
import Status from './pages/Status';
import Login from './pages/Login';
import Sessions from './pages/Sessions';

import './App.css'

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [api, setApi] = useState<BalanzAPI>(new BalanzAPI(""));
  const [token, setToken] = useState<string>("");
  const [loggedIn, setLoggedIn] = useState<boolean>(false);

  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  useMemo(() => {
    console.log("Connecting VITE_BALANZ_URL", import.meta.env.VITE_BALANZ_URL);
    const api_url: string = import.meta.env.VITE_BALANZ_URL ?? 'ws://localhost:9999/api';
    console.log("Setting balanz URL to", api_url);
    setApi(new BalanzAPI(api_url));
  }, []);

  useMemo(() => {
    const doLogin = async() => {
      if (token != "" && !api.dummy) {
        const ok = await api.login(token);
        setLoggedIn(ok);
      }
    }
    doLogin();
  }, 
  [token, api]);

  return loading ? (
    <Loader />
  ) : ( !loggedIn ? (
    <Login setToken={setToken} showLoginFailure={token != "" && !loggedIn}/> 
  ) : (
    <Container maxWidth={false} disableGutters>
        <Routes>
          <Route
            path="/Dashboard"
            element={
              <>
                <ResponsiveAppBar />
                <Dashboard api={api} />
              </>
            }
          />
          <Route
            path="/Chargers"
            element={
              <>
                <ResponsiveAppBar />
                <Chargers api={api} />
              </>
            }
          />
          <Route
            path="/Groups"
            element={
              <>
                <ResponsiveAppBar />
                <Groups api={api} />
              </>
            }
          />
          <Route
            path="/Tags"
            element={
              <>
                <ResponsiveAppBar />
                <Tags api={api} />
              </>
            }
          />
          <Route 
            path="/Status"
            element={
              <>
                <ResponsiveAppBar />
                <Status api={api} /> 
              </>
            }
          />
          <Route 
            path="/Sessions"
            element={
              <>
                <ResponsiveAppBar />
                <Sessions api={api} /> 
              </>
            }
          />
          <Route
            path="*"
            element={<Navigate to="/Status" replace />}
          />
        </Routes>
    </Container>
  ));
}

export default App
