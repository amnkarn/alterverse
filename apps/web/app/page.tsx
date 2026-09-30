"use client";

import { useState } from "react";
import MetaverseArena from "./components/Arena";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [joinSpaceId, setJoinSpaceId] = useState("");
  const [status, setStatus] = useState("");

  const handleSignup = async () => {
    setStatus("Signing up...");
    const response = await fetch(`${BACKEND_URL}/api/v1/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, type: "user" })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(`Signup failed: ${data.message ?? response.statusText}`);
      return;
    }

    setStatus("Registered. You can now sign in.");
  };

  const handleSignin = async () => {
    setStatus("Signing in...");
    const response = await fetch(`${BACKEND_URL}/api/v1/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(`Signin failed: ${data.message ?? response.statusText}`);
      return;
    }

    const data = await response.json();
    setToken(data.token);
    setStatus("Signed in. Create or join a space.");
  };

  const handleCreateSpace = async () => {
    if (!token) {
      setStatus("Sign in first.");
      return;
    }

    setStatus("Creating space...");
    const response = await fetch(`${BACKEND_URL}/api/v1/space`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: "Web client room", dimensions: "20x20" })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(`Space creation failed: ${data.message ?? response.statusText}`);
      return;
    }

    const data = await response.json();
    setSpaceId(data.spaceId);
    setStatus("Space created. Connecting to arena...");
  };

  const handleJoinSpace = () => {
    if (!joinSpaceId.trim()) {
      setStatus("Enter a valid space id.");
      return;
    }
    setSpaceId(joinSpaceId.trim());
    setStatus("Joining existing space...");
  };

  if (token && spaceId) {
    return <MetaverseArena spaceId={spaceId} token={token} />;
  }

  return (
    <div style={{ padding: 24, maxWidth: 560, margin: "0 auto", fontFamily: "sans-serif", color: "#111" }}>
      <h1>Metaverse Connect</h1>
      <p>Sign in or sign up, then create or join a space to connect via websocket.</p>

      <label style={{ display: "block", marginBottom: 8 }}>
        Username
        <input
          style={{ width: "100%", padding: 8, marginTop: 4 }}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>

      <label style={{ display: "block", marginBottom: 8 }}>
        Password
        <input
          type="password"
          style={{ width: "100%", padding: 8, marginTop: 4 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button onClick={handleSignin} style={{ padding: "10px 16px" }}>Sign in</button>
        <button onClick={handleSignup} style={{ padding: "10px 16px" }}>Sign up</button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <button onClick={handleCreateSpace} style={{ padding: "10px 16px" }} disabled={!token}>Create new space</button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Existing space id
          <input
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            value={joinSpaceId}
            onChange={(e) => setJoinSpaceId(e.target.value)}
          />
        </label>
        <button onClick={handleJoinSpace} style={{ padding: "10px 16px" }} disabled={!token}>Join existing space</button>
      </div>

      <div style={{ marginTop: 16, color: "#444" }}>{status}</div>
    </div>
  );
}
