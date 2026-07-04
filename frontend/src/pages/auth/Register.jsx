import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api from "../../api/axios.js";
import { useAuth, homePathFor } from "../../auth/AuthContext.jsx";
import AuthShell, { ErrorText, Field, SubmitButton } from "./AuthShell.jsx";
import GoogleButton from "../../components/GoogleButton.jsx";
import { track } from "../../lib/analytics.js";

export default function Register() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Already signed in — no reason to show the signup form again.
  if (isAuthenticated) return <Navigate to={homePathFor(role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        name: form.name || null,
        phone: form.phone || null,
      };
      const { data } = await api.post("/api/auth/register", payload);
      track("signup_completed", { method: "email" });
      login(data);
      navigate("/chat");
    } catch (err) {
      setError(err?.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Book faster and track your visits"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium">
            Sign in
          </Link>
        </>
      }
    >
      <ErrorText>{error}</ErrorText>
      <form onSubmit={submit}>
        <Field label="Full name" value={form.name} onChange={set("name")} />
        <Field label="Email" type="email" value={form.email} onChange={set("email")} required />
        <Field label="Phone (optional)" type="tel" value={form.phone} onChange={set("phone")} />
        <Field
          label="Password"
          type="password"
          value={form.password}
          onChange={set("password")}
          minLength={6}
          required
        />
        <SubmitButton loading={loading}>Create account</SubmitButton>
      </form>

      <GoogleButton label="signup_with" />
    </AuthShell>
  );
}
