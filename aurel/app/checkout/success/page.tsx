export default function CheckoutSuccessPage({ searchParams }: { searchParams: { order?: string } }) {
  return (
    <div className="container-aurel py-24 text-center">
      <h1 className="text-3xl mb-4">Thank you</h1>
      <p className="text-moss">
        {searchParams.order ? `Order ${searchParams.order} is confirmed.` : "Your order is confirmed."} A receipt is on its way.
      </p>
    </div>
  );
}
