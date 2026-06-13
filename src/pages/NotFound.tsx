import { Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#06070B" }}
    >
      <div className="text-center max-w-md px-6">
        <div
          className="text-8xl font-900 mb-4"
          style={{
            background: "linear-gradient(135deg, #7C5CFF, #4F7CFF)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </div>
        <h1 className="text-white font-700 text-2xl mb-3">Page not found</h1>
        <p className="text-white/40 text-sm mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/dashboard">
            <button className="hack-btn-primary">
              <Home size={15} />
              Go to Dashboard
            </button>
          </Link>
          <button onClick={() => window.history.back()} className="hack-btn-secondary">
            <ArrowLeft size={15} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
