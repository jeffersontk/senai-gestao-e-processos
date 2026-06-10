import { getPrisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function verifyUserPassword(userId: string, password: string) {
  const credential = await getPrisma().userCredential.findUnique({
    where: { userId },
    select: { passwordHash: true },
  });

  if (credential) {
    return verifyPassword(password, credential.passwordHash);
  }

  const fallbackPassword = process.env.APP_LOGIN_PASSWORD;
  return Boolean(fallbackPassword && password === fallbackPassword);
}

export async function setUserPassword(userId: string, password: string) {
  const passwordHash = await hashPassword(password);

  await getPrisma().userCredential.upsert({
    where: { userId },
    create: {
      userId,
      passwordHash,
    },
    update: {
      passwordHash,
    },
  });
}
