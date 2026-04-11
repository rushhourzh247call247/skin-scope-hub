import React from 'react';
import { useAuthImage } from '@/hooks/use-auth-image';

interface AuthImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | undefined;
}

/**
 * Drop-in replacement for <img> that automatically adds
 * Authorization header when loading images from /api/image/ endpoints.
 */
const AuthImage = React.forwardRef<HTMLImageElement, AuthImageProps>(
  ({ src, alt, ...props }, ref) => {
    const resolvedSrc = useAuthImage(src);
    return <img ref={ref} src={resolvedSrc || undefined} alt={alt} {...props} />;
  }
);

AuthImage.displayName = 'AuthImage';

export default AuthImage;
