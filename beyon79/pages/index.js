// Client-side redirect to /admin-unified for static export compatibility
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin-unified');
  }, [router]);

  return null;
}
