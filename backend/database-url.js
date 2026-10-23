function getDatabaseUrl(env = process.env) {
  const candidates = [
    env.DATABASE_URL,
    env.POSTGRES_URL,
    env.POSTGRES_PRISMA_URL,
    env.POSTGRES_URL_NON_POOLING
  ].filter(Boolean);

  const nonLocalUrl = candidates.find((candidate) => {
    try {
      const hostname = new URL(candidate).hostname.toLowerCase();
      return !['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
    } catch {
      return false;
    }
  });

  return env.VERCEL ? nonLocalUrl : nonLocalUrl || candidates[0];
}

module.exports = getDatabaseUrl;
