import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function IngestPageLoad() {
  const location = useLocation();

  useEffect(() => {
    const mp = window._mp;

    if (!mp?.waitUntil) {
      console.warn('Ingest Labs SDK is not available');
      return;
    }

    mp.waitUntil(
      () => Boolean(window._mp?.eedlInstance),
      15000,
      100,
      () => {
        window._mp.eedlInstance().ready();

        window._mp.safeExecute('evPageLoad', () => {
          const isProd = /luma-scents\.vercel\.app/.test(window.location.href);

          const payload = {
            'page.pageInfo.pageName': document.title,
            'env.pageUrl': window.location.href,
            'env.referrer': document.referrer,
            'env.pathName': window.location.pathname,
            'env.rs': isProd ? 'prd' : 'stg',
            'env.app_version': '1.0.0',
          };

          window.eedl('page_load', payload);
        })();
      }
    );
  }, [location.pathname, location.search, location.hash]);

  return null;
}
