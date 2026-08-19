import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-aurel py-32 text-center">
      <p className="eyebrow mb-4">404</p>
      <h1 className="text-4xl mb-6">This world doesn&apos;t exist — yet.</h1>
      <Link href="/" className="btn-primary inline-flex">Return Home</Link>
    </div>
  );
}
