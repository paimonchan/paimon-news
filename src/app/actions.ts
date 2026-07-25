"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { RateLimitError } from "@/application/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    redirect("/login?error=email");
  }

  try {
    await getContainer().auth.requestLogin(email);
  } catch (err) {
    if (err instanceof RateLimitError) {
      redirect("/login?error=rate");
    }
    throw err;
  }
  redirect("/login?sent=1");
}

export async function logoutAction() {
  await getContainer().session.destroySession();
  redirect("/");
}

export async function subscribeDigestAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const back = String(formData.get("back") ?? "/digest");
  if (!EMAIL_RE.test(email)) {
    redirect(`${back}?error=email`);
  }

  const container = getContainer();
  const user = await container.session.getSessionUser();
  await container.digest.subscribe(email, user?.id ?? null);

  redirect(`${back}?ok=1`);
}

export async function toggleBookmarkAction(formData: FormData) {
  const storyId = Number(formData.get("storyId"));
  const back = String(formData.get("back") ?? "/");
  if (!Number.isInteger(storyId)) redirect(back);

  const container = getContainer();
  const user = await container.session.getSessionUser();
  if (!user) redirect("/login");

  await container.repos.bookmarkRepo.toggle(user.id, storyId);

  revalidatePath(back);
  redirect(back);
}

/** Tombol refresh manual — hanya untuk development / pemilik lokal. */
export async function ingestNowAction() {
  if (process.env.NODE_ENV !== "development") {
    redirect("/");
  }
  await getContainer().ingest.run();
  revalidatePath("/");
  redirect("/?ingested=1");
}
