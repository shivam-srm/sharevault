// src/components/NoRequireAuth.jsx
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

const NoRequireAuth = () => {
  const { isLoggedIn } = useSelector((state) => state.auth);

  return !isLoggedIn ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

export default NoRequireAuth;
