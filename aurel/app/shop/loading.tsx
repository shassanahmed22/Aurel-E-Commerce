export default function Loading() {
  return (
    <div className="container-aurel py-20">
      <h1 className="text-5xl text-center mb-14 text-sand">All Fragrances</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-14">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[4/5] bg-sand/20 animate-pulse mb-4" />
            <div className="h-3 w-2/3 bg-sand/20 animate-pulse mb-2" />
            <div className="h-3 w-1/3 bg-sand/20 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
