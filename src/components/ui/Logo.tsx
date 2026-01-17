import Image from 'next/image';

export function Logo({ size = 32 }: { size?: number }) {
  return <Image src="/void-dex-logo.svg" alt="VoidDex" width={size} height={size} />;
}
