import { BookingFlow } from "@/components/booking/BookingFlow";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ "shop-slug": string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const shopSlug = resolvedParams["shop-slug"];
  const barberId = resolvedSearchParams["barber_id"] as string | undefined;

  return (
    <main className="min-h-screen bg-zinc-950 text-white selection:bg-rose-500/30">
      <BookingFlow shopSlug={shopSlug} initialBarberId={barberId} />
    </main>
  );
}
