'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getWebStoreByOwner } from '@/graphql/query/webstore';
import { decodeJwt } from '@/lib/jwt';
import { WebStoreAiAssistant } from '@/components/web-store/WebStoreAiAssistant';

function getScope(pathname: string): 'setup' | 'homepage' | 'pdp' | 'plp' | 'checkout' {
  if (pathname.includes('/pages')) return pathname.match(/\/pages\/[^/]+/) ? 'homepage' : 'setup';
  if (pathname.includes('/products')) return 'pdp';
  if (pathname.includes('/categories')) return 'plp';
  if (pathname.includes('/checkout')) return 'checkout';
  return 'setup';
}

/** Global owner-only assistant for every /owner/web-store/* route. */
export function OwnerWebStoreAssistant() {
  const pathname = usePathname();
  const [webStoreId, setWebStoreId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    if (!token) return;
    const payload = decodeJwt(token);
    const ownerId = String(payload?.sub ?? payload?.id ?? payload?.user_id ?? '');
    if (!ownerId) return;
    getWebStoreByOwner(ownerId, token)
      .then((res) => setWebStoreId(res.webStoreByOwner?.id ?? null))
      .catch(() => setWebStoreId(null));
  }, []);

  const scope = useMemo(() => getScope(pathname), [pathname]);
  // Builder page mounts its own WebStoreAiAssistant wired to live drafts.
  if (!pathname.startsWith('/owner/web-store') || pathname === '/owner/web-store' || pathname.includes('/builder') || !webStoreId) return null;

  return (
    <WebStoreAiAssistant
      webStoreId={webStoreId}
      scope={scope}
      context={{ scope, route: pathname }}
      onApply={() => {
        // Sub-route editors own their drafts. The global assistant remains
        // advisory here; persistence still requires that editor's Save action.
      }}
    />
  );
}
