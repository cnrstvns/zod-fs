import { createZodFs } from '@zod-fs/index';
import { z } from 'zod';

(async () => {
  const zodFs = createZodFs('zod-fs');

  const helper = zodFs.createFileHelper({
    fileName: 'settings.json',
    defaultValues: { theme: 'light' },
    schema: z.object({
      theme: z.enum(['light', 'dark']),
    }),
  });

  const data = await helper.read();

  console.log(data); // { theme: 'light' } (defaults)

  await helper.write({ theme: 'dark' });

  // @ts-expect-error
  await helper.update({ theme: 'red' }); // throws ZodError
})();
