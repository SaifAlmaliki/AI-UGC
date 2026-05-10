const ZERNIO_API_BASE = 'https://zernio.com/api/v1';

async function zernioFetch(endpoint: string, options: RequestInit = {}) {
  const apiKey = process.env.ZERNIO_API_KEY;
  if (!apiKey) {
    throw new Error('ZERNIO_API_KEY is not set. Please add it to your .env file.');
  }

  const response = await fetch(`${ZERNIO_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const msg =
      typeof errorData.message === 'string'
        ? errorData.message
        : typeof errorData.error === 'string'
          ? errorData.error
          : typeof (errorData.error as { message?: string } | undefined)?.message === 'string'
            ? (errorData.error as { message: string }).message
            : Object.keys(errorData).length > 0
              ? JSON.stringify(errorData)
              : '';
    throw new Error(
      `Zernio API error: ${response.status} ${response.statusText}${msg ? ` — ${msg}` : ''}`
    );
  }

  return response.json();
}

function profilesFromListResponse(res: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(res)) return res as Array<Record<string, unknown>>;
  if (res && typeof res === 'object') {
    const o = res as Record<string, unknown>;
    if (Array.isArray(o.profiles)) return o.profiles as Array<Record<string, unknown>>;
    if (Array.isArray(o.data)) return o.data as Array<Record<string, unknown>>;
  }
  return [];
}

export const zernio = {
  profiles: {
    list: async () => {
      const res = await zernioFetch('/profiles');
      return { profiles: profilesFromListResponse(res) };
    },
    create: async (name: string, description?: string) => {
      return zernioFetch('/profiles', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
    },
  },
  connect: {
    getConnectUrl: async (platform: string, profileId: string, redirectUrl?: string) => {
      // Ensure platform is lowercase as expected by Zernio
      const p = platform.toLowerCase();
      let url = `/connect/${p}?profileId=${profileId}`;
      // HTTP query must match API (snake_case); Node SDK maps redirectUrl → this param
      if (redirectUrl) {
        url += `&redirect_url=${encodeURIComponent(redirectUrl)}`;
      }
      return zernioFetch(url);
    },
  },
  accounts: {
    list: async () => {
      return zernioFetch('/accounts');
    },
    delete: async (accountId: string) => {
      return zernioFetch(`/accounts/${accountId}`, {
        method: 'DELETE',
      });
    },
  },
  posts: {
    createPost: async (data: {
      content: string;
      scheduledFor?: string;
      publishNow?: boolean;
      timezone?: string;
      mediaItems?: Array<{ url: string; type: 'image' | 'video' | 'document' }>;
      platforms: Array<{
        platform: string;
        accountId: string;
        platformSpecificData?: Record<string, unknown>;
      }>;
    }) => {
      return zernioFetch('/posts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },
};
