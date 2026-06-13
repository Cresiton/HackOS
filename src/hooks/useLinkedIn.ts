import { useState, useCallback } from "react";
import { connectLinkedIn } from "@/lib/linkedinService";

export function useLinkedIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (currentPath: string) => {
    setLoading(true);
    setError(null);
    try {
      await connectLinkedIn(currentPath);
    } catch (err: any) {
      let errMsg = "Unable to connect LinkedIn";
      // Map Supabase provider disabled/missing redirect errors
      if (
        err.message?.toLowerCase().includes("provider_disabled") ||
        err.message?.toLowerCase().includes("not enabled") ||
        err.message?.toLowerCase().includes("disabled")
      ) {
        errMsg = "LinkedIn provider is not enabled in Supabase";
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    signIn,
    loading,
    error,
    setError,
  };
}
