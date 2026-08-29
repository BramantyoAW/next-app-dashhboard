export default function OwnerProductDetailPage({ params }: { params: { productId: string } }) {
  return (
    <section className="p-8">
      <h1 className="text-2xl font-semibold">Product {params.productId}</h1>
      <p className="text-gray-600">Detail master product (stub).</p>
    </section>
  );
}
