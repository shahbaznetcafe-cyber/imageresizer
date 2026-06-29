const DEFAULT_BACKEND_MESSAGE =
  'Backend API is not reachable. Please start the backend server or set VITE_API_URL to your live backend.';

export async function getApiErrorMessage(response, fallbackMessage) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      const data = await response.json();
      const detail = data?.detail;

      if (typeof detail === 'string') {
        return detail;
      }

      if (detail?.[navigator.language.startsWith('ur') ? 'ur' : 'en']) {
        return detail[navigator.language.startsWith('ur') ? 'ur' : 'en'];
      }
    } catch {
      return fallbackMessage || DEFAULT_BACKEND_MESSAGE;
    }
  }

  return fallbackMessage || DEFAULT_BACKEND_MESSAGE;
}

export function getNetworkErrorMessage(error, fallbackMessage) {
  if (error instanceof TypeError || /json|fetch|network/i.test(error?.message || '')) {
    return DEFAULT_BACKEND_MESSAGE;
  }

  return error?.message || fallbackMessage || DEFAULT_BACKEND_MESSAGE;
}
