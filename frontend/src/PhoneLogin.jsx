import { useEffect, useRef, useState } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { auth } from "./firebase";

export default function PhoneLogin() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const recaptchaRef = useRef(null);

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  async function sendOtp(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(
          auth,
          "recaptcha-container",
          { size: "normal" }
        );
      }

      const result = await signInWithPhoneNumber(
        auth,
        phone.trim(),
        recaptchaRef.current
      );

      setConfirmation(result);
      setMessage("OTP sent successfully. Check your phone.");
    } catch (error) {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      setMessage(error.message || "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      await confirmation.confirm(otp.trim());
      setMessage("Phone verified! You are logged in.");
      // Firebase maintains the signed-in session.
    } catch (error) {
      setMessage(
        error.code === "auth/invalid-verification-code"
          ? "Incorrect OTP. Please try again."
          : error.message || "OTP verification failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "60px auto", padding: 20 }}>
      <h2>Login with Phone</h2>

      {!confirmation ? (
        <form onSubmit={sendOtp}>
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            type="tel"
            placeholder="+919876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            style={{ display: "block", width: "100%", margin: "10px 0" }}
          />

          <div id="recaptcha-container" />

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp}>
          <label htmlFor="otp">Enter the OTP</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            style={{ display: "block", width: "100%", margin: "10px 0" }}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
      )}

      {message && <p role="status">{message}</p>}
    </div>
  );
}