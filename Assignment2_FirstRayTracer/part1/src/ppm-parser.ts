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

export async function writeP6(path: string, image: ImageData): Promise<void> {
  let header: string[] = [];
  header.push('P6');
  header.push('# Encoded with TypeScript <3');
  header.push(`${image.width} ${image.height}`);
  header.push('255');

  // await fs.promises.writeFile(path, header.join('\n') + '\n', 'utf-8');

  const data = image.data;
  let body: Uint8ClampedArray = data.filter((_, index) => {
    return (index + 1) % 4 != 0;
  });

  // await fs.promises.appendFile(path, Buffer.from(body));

  // Preview.app seems to like a trailing newline
  // await fs.promises.appendFile(path, '\n', 'utf-8');
}
