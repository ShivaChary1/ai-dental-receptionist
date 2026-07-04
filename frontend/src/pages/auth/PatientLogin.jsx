import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../api/axios.js";
import { useAuth, homePathFor } from "../../auth/AuthContext.jsx";
import AuthShell, { ErrorText, Field, SubmitButton } from "./AuthShell.jsx";
import GoogleButton from "../../components/GoogleButton.jsx";

export default function PatientLogin() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  // mode: "email" | "phone"
  const [mode, setMode] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // phone/otp state
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already signed in — no reason to show the login form again.
  if (isAuthenticated) return <Navigate to={homePathFor(role)} replace />;

  const emailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      login(data);
      navigate("/chat");
    } catch (err) {
      setError(err?.response?.data?.detail || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/otp/request", { phone });
      setOtpSent(true);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not send code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/otp/verify", { phone, code });
      login(data);
      navigate("/chat");
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Patient Login"
      subtitle="Sign in to see your appointments and history"
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="text-primary font-medium">
            Create an account
          </Link>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 rounded-lg border border-border bg-muted/60 p-0.5 text-sm">
        {[
          { key: "email", label: "Email & password" },
          { key: "phone", label: "Phone (OTP)" },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setError(""); }}
            className={`relative rounded-md py-1.5 text-xs font-medium transition-colors ${
              mode === m.key ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {mode === m.key && (
              <motion.span
                layoutId="loginMode"
                className="absolute inset-0 rounded-md bg-primary shadow-primary"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{m.label}</span>
          </button>
        ))}
      </div>

      <ErrorText>{error}</ErrorText>

      {mode === "email" && (
        <form onSubmit={emailSubmit}>
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <SubmitButton loading={loading}>Sign in</SubmitButton>
        </form>
      )}

      {mode === "phone" && !otpSent && (
        <form onSubmit={requestOtp}>
          <Field
            label="Phone number"
            type="tel"
            placeholder="e.g. 15551234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <SubmitButton loading={loading}>Send code</SubmitButton>
        </form>
      )}

      {mode === "phone" && otpSent && (
        <form onSubmit={verifyOtp}>
          <p className="mb-3 text-sm text-muted-foreground">
            We sent a code to <b className="text-foreground">{phone}</b>.
          </p>
          <Field
            label="Verification code"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <SubmitButton loading={loading}>Verify & sign in</SubmitButton>
          <button
            type="button"
            onClick={() => { setOtpSent(false); setCode(""); }}
            className="mt-3 w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Use a different number
          </button>
        </form>
      )}

      <GoogleButton label="signin_with" />
    </AuthShell>
  );
}
