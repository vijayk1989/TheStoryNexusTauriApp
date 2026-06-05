import { db } from "@/services/database";

export async function resetTestDb(): Promise<void> {
  if (db.isOpen()) {
    db.close();
  }
  await db.delete();
  await db.open();
  localStorage.clear();
}
