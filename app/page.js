import { redirect } from 'next/navigation';

// The middleware sends "/" to each role's home; this is only a fallback.
export default function Index() {
  redirect('/login');
}
