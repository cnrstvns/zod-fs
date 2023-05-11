# zod-fs

zod-fs allows you to read, write, and update JSON files backed by a type-safe contract powered by [zod](https://github.com/colinhacks/zod).

## Methods

### createZodFs

This method creates the root helper that you will use across your application. It returns a function that can create an instance of the FileHelper class which implements the read, write, and update methods. The only argument that this function accepts is the name of your application as a string.

For example, if you pass a name of `My First App` and you're on a macOS device, you can find your data directory at `/Users/Me/Library/Application Support/My First App`. If your NODE_ENV is `development`, we automatically append `(development)` to the app name to prevent inconsistencies between production and development apps.

### createFileHelper

This method returns an instance of the FileHelper class. You can then use the methods of this class to read, write, and update the data for each respective instance. For example, if you wanted to read the data from a created file helper, you would call `.read()`.

### Example:

```ts
import { createZodFs } from '@zod-fs/index';
import { z } from 'zod';

(async () => {
  // Instantiate zod-fs with an app name of `zod-fs`
  const zodFs = createZodFs('zod-fs');

  // Create a file helper for our `settings.json` file
  const helper = zodFs.createFileHelper({
    fileName: 'settings.json',
    defaultValues: { theme: 'light' },
    schema: z.object({
      theme: z.enum(['light', 'dark']),
    }),
  });

  // Read the data from the file
  const data = await helper.read();

  console.log(data); // { theme: 'light' } (defaults)

  // Write new data to the file
  await helper.write({ theme: 'dark' });

  // @ts-expect-error try to update with invalid data
  await helper.update({ theme: 'red' }); // throws ZodError
})();
```
