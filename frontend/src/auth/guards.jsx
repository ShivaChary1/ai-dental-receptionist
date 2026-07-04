import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

function Guard({ allow, redirect, children }) {
  const auth = useAuth();
  const location = useLocation();
  if (!allow(auth)) {
    return <Navigate to={redirect} replace state={{ from: location }} />;
  }
  return children;
}

export function RequirePatient({ children }) {
  return (
    <Guard allow={(a) => a.isPatient} redirect="/login">
      {children}
    </Guard>
  );
}

export function RequireHospital({ children }) {
  return (
    <Guard allow={(a) => a.isHospital} redirect="/hospital/login">
      {children}
    </Guard>
  );
}

export function RequireSuperAdmin({ children }) {
  return (
    <Guard allow={(a) => a.isSuperAdmin} redirect="/superadmin/login">
      {children}
    </Guard>
  );
}
