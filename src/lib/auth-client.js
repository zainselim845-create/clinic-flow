import { createAuthClient } from 'better-auth/client';
import { organizationClient } from 'better-auth/client/plugins';

const getBaseURL = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:3000';
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
