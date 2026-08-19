export default function Loading() {
  return (
    <div>
      <div className="relative h-[80vh] min-h-[560px] bg-sand/20 animate-pulse" />
      <div className="container-aurel py-20">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[4/5] bg-sand/20 animate-pulse mb-4" />
              <div className="h-3 w-2/3 bg-sand/20 animate-pulse mb-2" />
              <div className="h-3 w-1/3 bg-sand/20 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
