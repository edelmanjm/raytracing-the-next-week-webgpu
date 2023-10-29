export function convertP3(image: ImageData): string {
  let out: string[] = [];

  out.push('P3');
  out.push('# Encoded with TypeScript <3');
  out.push(`${image.width} ${image.height}`);
  out.push('255');

  const data = image.data;

  out.push(
    data
      .filter((_, index) => {
        return (index + 1) % 4 != 0;
      })
      .join(' '),
  );

  return out.join('\n') + '\n';
}

/**
 * Returns a base-64 string representing the P6 encoding of the provided image
 * @param image The image to encode
 */
export function convertP6(image: ImageData): string {
  let header: string[] = [];
  header.push('P6');
  header.push('# Encoded with TypeScript <3');
  header.push(`${image.width} ${image.height}`);
  header.push('255');

  let headerJoined: string = header.join('\n') + '\n';

  const data = image.data;
  let body: Uint8ClampedArray = data.filter((_, index) => {
    return (index + 1) % 4 != 0;
  });

  let binary = '';
  let len = body.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(body[i]);
  }

  return btoa(headerJoined + binary + '\n');
}
