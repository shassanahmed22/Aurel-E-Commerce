export default function Loading() {
  return (
    <div className="container-aurel py-16">
      <div className="grid md:grid-cols-2 gap-12 mb-20">
        <div className="aspect-square bg-sand/20 animate-pulse" />
        <div className="space-y-4">
          <div className="h-3 w-1/4 bg-sand/20 animate-pulse" />
          <div className="h-10 w-2/3 bg-sand/20 animate-pulse" />
          <div className="h-6 w-1/5 bg-sand/20 animate-pulse" />
          <div className="h-20 w-full bg-sand/20 animate-pulse" />
          <div className="h-12 w-full bg-sand/20 animate-pulse mt-8" />
        </div>
      </div>
    </div>
  );
}
