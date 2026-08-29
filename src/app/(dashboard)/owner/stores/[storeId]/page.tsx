export default function OwnerStoreDetailPage({ params }: { params: { storeId: string } }) {
  return (
    <section className="p-8">
      <h1 className="text-2xl font-semibold">Store {params.storeId}</h1>
      <p className="text-gray-600">Detail store / switch context (stub).</p>
    </section>
  );
}
