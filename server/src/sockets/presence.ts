// Tracks online users with multi-tab support: counts sockets per user.
const socketsPerUser = new Map<string, number>();
const listeners = new Set<(count: number) => void>();

export function userConnected(userId: string): number {
  socketsPerUser.set(userId, (socketsPerUser.get(userId) ?? 0) + 1);
  const count = socketsPerUser.size;
  for (const fn of listeners) fn(count);
  return count;
}

export function userDisconnected(userId: string): number {
  const n = (socketsPerUser.get(userId) ?? 1) - 1;
  if (n <= 0) socketsPerUser.delete(userId);
  else socketsPerUser.set(userId, n);
  const count = socketsPerUser.size;
  for (const fn of listeners) fn(count);
  return count;
}

export function onlineCount(): number {
  return socketsPerUser.size;
}

export function onlineUserIds(): string[] {
  return [...socketsPerUser.keys()];
}

export function onPresenceChange(fn: (count: number) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function resetPresence(): void {
  socketsPerUser.clear();
}
