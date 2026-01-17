interface DocImageProps {
  title: string;
}

export function DocImage({ title }: DocImageProps) {
  return (
    <div className="relative mb-6">
      <img src="/docs.webp" alt={title} className="w-full h-auto rounded-lg" />
      <div className="absolute bottom-2 left-3 sm:bottom-6 sm:left-8 text-white px-3 py-2 rounded-md text-2xl sm:text-5xl">
        {title}
      </div>
    </div>
  );
}
