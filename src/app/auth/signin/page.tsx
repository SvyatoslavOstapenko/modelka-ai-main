import { redirect } from 'next/navigation';

/**
 * Sign-in page - redirects to home page
 * We use modal-based authentication on the home page
 */
export default function SignInPage() {
  redirect('/');
}
