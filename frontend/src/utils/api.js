export function getApiBaseUrl() {
  return (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
}

export function getApiUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
