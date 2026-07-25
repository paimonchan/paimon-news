import type { Metadata } from "next";
import Link from "next/link";
import { getContainer } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Berhenti Berlangganan" };

export default async function BerhentiPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let status: "ok" | "invalid" | "none" = "none";
  if (token) {
    const changes = getContainer().repos.digestRepo.deactivateByToken(token);
    status = changes > 0 ? "ok" : "invalid";
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      {status === "ok" && (
        <>
          <p className="text-4xl">👋</p>
          <h1 className="mt-3 text-xl font-bold">Langganan digest dihentikan</h1>
          <p className="mt-2 text-sm text-stone-500">
            Kamu tidak akan menerima email digest lagi. Berlangganan lagi kapan saja di
            halaman digest.
          </p>
        </>
      )}
      {status === "invalid" && (
        <>
          <h1 className="text-xl font-bold">Tautan tidak valid</h1>
          <p className="mt-2 text-sm text-stone-500">
            Token tidak ditemukan atau langganan sudah dihentikan sebelumnya.
          </p>
        </>
      )}
      {status === "none" && (
        <>
          <h1 className="text-xl font-bold">Berhenti berlangganan</h1>
          <p className="mt-2 text-sm text-stone-500">
            Gunakan tautan berhenti yang ada di bagian bawah email digest.
          </p>
        </>
      )}
      <Link href="/" className="mt-6 inline-block text-sm text-amber-700 hover:underline">
        ← Kembali ke beranda
      </Link>
    </div>
  );
}
