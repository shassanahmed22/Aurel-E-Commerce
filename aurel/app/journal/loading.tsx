export default function Loading() {
  return (
    <div className="container-aurel py-20">
      <h1 className="text-5xl text-center mb-14 text-sand">Journal</h1>
      <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[4/3] bg-sand/20 animate-pulse mb-4" />
            <div className="h-3 w-1/4 bg-sand/20 animate-pulse mb-2" />
            <div className="h-5 w-2/3 bg-sand/20 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
