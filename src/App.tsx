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

const api_url: string = import.meta.env.VITE_BALANZ_URL ?? 'ws://localhost:9999/api';
console.log("Setting balanz URL to", api_url);

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [api, _] = useState<BalanzAPI>(new BalanzAPI(api_url));
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
    const doLogin = async() => {
      if (token != "" && api) {
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
        <Route path="/Status" element={<Status userType={userType} api={api} />} />
        <Route path="*" element={<Navigate to="/Status" replace />} />
      </Routes>
    </Container>
    );
  }

  return  (
    <Container maxWidth={false} disableGutters>
      <ResponsiveAppBar  userType={userType}/>
      <Routes>
          <Route path="/Status" element={<Status userType={userType} api={api} />} />
          <Route path="/Statistics" element={<Statistics api={api} />} />
          <Route path="/Chargers" element={<Chargers api={api} />} />
          <Route path="/Groups" element={<Groups api={api} />} />
          <Route path="/Tags" element={<Tags api={api} />} />
          <Route path="/Sessions" element={<Sessions api={api} />} />
          <Route path="/Users" element={<Users api={api} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Container>
  );
}

export default App;
