import { useState, useMemo, useEffect } from 'react';
import { Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { Container } from '@mui/material';
import ResponsiveAppBar from './components/ResponsiveAppBar';
import BalanzAPI from './services/balanz_api';
import Loader from './common/Loader';
import NoConnection from './common/NoConnection';
import Chargers from './pages/Chargers';
import Groups from './pages/Groups';
import Tags from './pages/Tags';
import Statistics from './pages/Statistics';
import Status from './pages/Status';
import Login from './pages/Login';
import Sessions from './pages/Sessions';
import Users from './pages/Users';
import Logs from './pages/Logs';

import { CONN_STATE } from './types/types';

import './App.css'

interface AppProp {
  api: BalanzAPI;
}

const App: React.FC<AppProp> = ({ api }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string>("");
  const [connState, setConnState] = useState<CONN_STATE>(CONN_STATE.NOT_CONNECTED);
  const [userType, setUserType] = useState<string>("");
  const [doingLogin, setDoingLogin] = useState<boolean>(false);

  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    api.set_connstate_func(setConnState);
    api.connect();
    setTimeout(() => setLoading(false), 2000);
  }, []);

  useMemo(() => {
    const doLogin = async() => {
      if (token != "" && connState == CONN_STATE.CONNECTED) {
        console.log("Logging in");
        setDoingLogin(true);
        const user_type = await api.login(token);
        if (user_type != "") {
          setUserType(user_type);
          console.log("Logged in as", user_type);
        }  
        setDoingLogin(false);
      }
    }
    doLogin();
  }, 
  [token, connState]);

  if (loading)
      return (<Loader />);

  if (connState == CONN_STATE.NOT_CONNECTED)
    return (
     <NoConnection /> 
    );

  if (connState == CONN_STATE.CONNECTED) {
    // Check if we have a token cookie from which to receive token
    // If we do, we will try to log in with it.
    let got_cookie = false;
    if (token == "" && !doingLogin) {
      const find_token = document.cookie.split('; ').find(row => row.startsWith('token='));
      if (find_token) {
        const cookie_token = find_token.split('=')[1];
        setToken(cookie_token);
        got_cookie = true;
      }
    }
    // If we don't, we will show the login page.
    if (!got_cookie)
      return (
        <Login setToken={setToken} showLoginFailure={token != "" && !doingLogin}/> 
      );
  }

  // We know connState == CONN_STATE.LOGGED_IN at this point.
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
          <Route path="/Chargers" element={<Chargers userType={userType} api={api} />} />
          <Route path="/Groups" element={<Groups api={api} />} />
          <Route path="/Tags" element={<Tags api={api} />} />
          <Route path="/Sessions" element={<Sessions api={api} />} />
          <Route path="/Users" element={<Users api={api} />} />
          <Route path="/Logs" element={<Logs api={api} />} />
          <Route path="*" element={<Navigate to="/Status" replace />} />
      </Routes>
    </Container>
  );
}

export default App;
