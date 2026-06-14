import { supabase } from "./supabase";

/**
 * Triggers LinkedIn OAuth login via Supabase using the linkedin_oidc provider.
 * Stores oauth_provider and oauth_redirect_path to sessionStorage before redirecting.
 *
 * @param currentPath The page path the user is currently on (to return to after redirect).
 */
export async function connectLinkedIn(currentPath: string): Promise<void> {
  sessionStorage.setItem("oauth_provider", "linkedin");
  sessionStorage.setItem("oauth_redirect_path", currentPath);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "linkedin_oidc",
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        prompt: "login",
      },
    },
  });

  if (error) {
    throw error;
  }
}

/**
 * Disconnects the LinkedIn integration for a user, clearing all provider-related fields in profiles.
 */
export async function disconnectLinkedIn(userId: string): Promise<void> {
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      linkedin_name: null,
      linkedin_url: null,
      linkedin_avatar: null,
      linkedin_connected: false,
      linkedin_connected_at: null,
    })
    .eq("id", userId);

  if (profileError) {
    throw new Error(`Failed to disconnect LinkedIn in profile: ${profileError.message}`);
  }
}
