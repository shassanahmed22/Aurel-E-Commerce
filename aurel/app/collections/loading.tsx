export default function Loading() {
  return (
    <div className="container-aurel py-20">
      <p className="eyebrow text-center mb-3 text-sand">Five Worlds</p>
      <h1 className="text-5xl text-center mb-14 text-sand">Collections</h1>
      <div className="grid md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[16/10] bg-sand/20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
