import { useRouter } from "next/router";

export default function Error({ statusCode }: { statusCode: number }) {
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
      <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>
        {statusCode || "Error"}
      </h1>
      <p style={{ fontSize: "1.25rem", marginBottom: "2rem", color: "#6B7280" }}>
        {statusCode === 404
          ? "Page not found"
          : "An error occurred"}
      </p>
      <button
        onClick={() => router.push("/dashboard")}
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
        Go to Dashboard
      </button>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};
