import { useRouter } from "next/router";

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      backgroundColor: "#F7F9F8",
      color: "#1F2937",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "1rem", color: "#0B5D3B" }}>
        404
      </h1>
      <p style={{ fontSize: "1.25rem", marginBottom: "2rem", color: "#6B7280" }}>
        Page not found
      </p>
      <button
        onClick={() => router.push("/login")}
        style={{
          backgroundColor: "#0B5D3B",
          color: "white",
          padding: "0.75rem 1.5rem",
          borderRadius: "0.375rem",
          border: "none",
          cursor: "pointer",
          fontSize: "1rem",
          fontWeight: "500",
        }}
      >
        Go to Login
      </button>
    </div>
  );
}
