import "server-only";
import { read, write } from "../db/store";

export async function listNotifications(
  userId: string,
  opts: { unreadOnly?: boolean; limit?: number } = {},
) {
  return read((db) =>
    db.notifications
      .filter((n) => n.userId === userId && (!opts.unreadOnly || !n.readAt))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, opts.limit ?? 100),
  );
}

export async function unreadCount(userId: string) {
  return read((db) => db.notifications.filter((n) => n.userId === userId && !n.readAt).length);
}

export async function markRead(userId: string, id: string | "all") {
  await write((db) => {
    const now = new Date().toISOString();
    for (const n of db.notifications)
      if (n.userId === userId && !n.readAt && (id === "all" || n.id === id)) n.readAt = now;
  });
}
