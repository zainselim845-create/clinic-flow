import { createAuthClient } from 'better-auth/client';
import { organizationClient } from 'better-auth/client/plugins';

const getBaseURL = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return (typeof process !== 'undefined' && process.env?.VITE_APP_URL) || 'https://clinicflow.app';
};

/**
 * Better Auth Client Instance
 */
export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    organizationClient()
  ]
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  organization: clientOrganization
} = authClient;
