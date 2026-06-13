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
