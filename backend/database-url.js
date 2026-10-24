function getDatabaseUrl(env = process.env) {
  const candidates = [
    env.DATABASE_URL,
    env.POSTGRES_URL,
    env.POSTGRES_PRISMA_URL,
    env.POSTGRES_URL_NON_POOLING,
    env.DATABASE_URI
  ].filter(Boolean);

  const nonLocalUrl = candidates.find((candidate) => {
    try {
      const url = new URL(candidate);
      if (!/^postgres(?:ql)?:$/i.test(url.protocol)) return false;
      const hostname = url.hostname.toLowerCase();
      return !['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
    } catch {
      return false;
    }
  });

  if (env.VERCEL) return nonLocalUrl;
  return nonLocalUrl || candidates.find((candidate) => {
    try {
      return /^postgres(?:ql)?:$/i.test(new URL(candidate).protocol);
    } catch {
      return false;
    }
  });
}

module.exports = getDatabaseUrl;
