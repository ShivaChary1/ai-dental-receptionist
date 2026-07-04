import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/axios.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import AuthShell, { ErrorText, Field, SubmitButton } from "./AuthShell.jsx";

export default function HospitalLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/hospital";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/hospital/login", { email, password });
      login(data);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Clinic login" subtitle="Manage your clinic on SmileDesk" backLabel="Back to SmileDesk">
      <ErrorText>{error}</ErrorText>
      <form onSubmit={submit}>
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <SubmitButton loading={loading}>Sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}
