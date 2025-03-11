import { useState, useMemo, useEffect } from 'react';
import { Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { Container } from '@mui/material';
import ResponsiveAppBar from './components/ResponsiveAppBar';
import BalanzAPI from './services/balanz_api';
import Loader from './common/Loader';
import Chargers from './pages/Chargers';
import Groups from './pages/Groups';
import Tags from './pages/Tags';
import Statistics from './pages/Statistics';
import Status from './pages/Status';
import Login from './pages/Login';
import Sessions from './pages/Sessions';
import Users from './pages/Users';

import './App.css'

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [api, setApi] = useState<BalanzAPI>(new BalanzAPI(""));
  const [token, setToken] = useState<string>("");
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [userType, setUserType] = useState<string>("");

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
        const user_type = await api.login(token);
        if (user_type != "") {
          setUserType(user_type);
          setLoggedIn(true);
          console.log("Logged in as", user_type);
        }  
      }
    }
    doLogin();
  }, 
  [token, api]);

  if (loading)
      return (<Loader />);

  if (!loggedIn)
    return (
      <Login setToken={setToken} showLoginFailure={token != "" && !loggedIn}/> 
    );

  if (userType == "Status" || userType == "SessionPriority") {
    return (
    <Container maxWidth={false} disableGutters>
      <Routes>
        <Route 
          path="/Status"
          element={
            <>
              <Status api={api} /> 
            </>
          }
        />
        <Route
          path="*"
          element={<Navigate to="/Status" replace />}
        />
      </Routes>
    </Container>
    );
  }

  return  (
    <Container maxWidth={false} disableGutters>
        <Routes>
            <Route
              path="/Statistics"
              element={
                <>
                  <ResponsiveAppBar userType={userType}/>
                  <Statistics api={api} />
                </>
              }
            />
          <Route
            path="/Chargers"
            element={
              <>
                <ResponsiveAppBar  userType={userType}/>
                <Chargers api={api} />
              </>
            }
          />
          <Route
            path="/Groups"
            element={
              <>
                <ResponsiveAppBar  userType={userType}/>
                <Groups api={api} />
              </>
            }
          />
          <Route
            path="/Tags"
            element={
              <>
                <ResponsiveAppBar  userType={userType}/>
                <Tags api={api} />
              </>
            }
          />
          <Route 
            path="/Status"
            element={
              <>
                <ResponsiveAppBar  userType={userType}/>
                <Status api={api} /> 
              </>
            }
          />
          <Route 
            path="/Sessions"
            element={
              <>
                <ResponsiveAppBar  userType={userType}/>
                <Sessions api={api} /> 
              </>
            }
          />
          <Route 
            path="/Users"
            element={
              <>
                <ResponsiveAppBar  userType={userType}/>
                <Users api={api} /> 
              </>
            }
          />
          <Route
            path="*"
            element={<Navigate to="/Status" replace />}
          />
        </Routes>
    </Container>
  );
}

export default App;
