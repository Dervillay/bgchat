import { useAuth0 } from "@auth0/auth0-react";

export function useFetchWithAuth() {
  const { getAccessTokenSilently } = useAuth0();

  return async (url: string, options: RequestInit = {}) => {
    const token = await getAccessTokenSilently({
      authorizationParams: {
        audience: process.env.REACT_APP_AUTH0_AUDIENCE,
      }
    });

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);

    // Let the browser set multipart boundaries for FormData uploads
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return fetch(url, { ...options, headers });
  };
}
