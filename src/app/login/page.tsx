import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { requestLoginAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;
  const user = await getContainer().session.getSessionUser();

  if (user) {
    redirect("/tersimpan");
  }

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Masuk ke Lensa</h1>
      <p className="mt-2 text-sm text-stone-500">
        Tanpa kata sandi — kami kirim tautan masuk ke email kamu. Dengan akun, kamu bisa
        menyimpan peristiwa dan berlangganan digest.
      </p>

      {sent ? (
        <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          <p className="font-semibold">✓ Tautan terkirim!</p>
          <p className="mt-1">
            Cek kotak masuk email kamu.
            {isDev &&
              " (Mode dev tanpa kunci Resend: tautan juga dicetak di terminal server.)"}
          </p>
        </div>
      ) : (
        <form action={requestLoginAction} className="mt-6 space-y-3">
          <input
            type="email"
            name="email"
            required
            placeholder="alamat@email.com"
            className="h-11 w-full rounded-xl border border-stone-300 bg-white px-4 outline-none focus:border-amber-600 dark:border-stone-700 dark:bg-stone-900"
          />
          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-amber-700 font-semibold text-white hover:bg-amber-800"
          >
            Kirim tautan masuk
          </button>
          {error === "email" && (
            <p className="text-sm text-red-600">Alamat email tidak valid.</p>
          )}
          {error === "expired" && (
            <p className="text-sm text-red-600">
              Tautan kedaluwarsa atau sudah dipakai. Minta tautan baru.
            </p>
          )}
          {error === "rate" && (
            <p className="text-sm text-red-600">
              Terlalu banyak permintaan. Maksimal 3 tautan per jam — coba lagi nanti.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
