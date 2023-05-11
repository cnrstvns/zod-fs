/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ZodType, z } from 'zod';
import * as fs from 'fs-extra';
import { deepMerge } from './deep-merge';

export type JSONOptions = {
  replacer?: (string | number)[] | null | undefined;
  space?: string | number | undefined;
};

export type CreateFileHelperOptions<T extends ZodType<any, any>> = {
  fileName: string;
  schema: T;
  defaultValues: z.infer<T>;
  json?: JSONOptions;
};

/**
 * Returns the app data directory path
 * @param appId - the name of the application
 * @returns the path to the app's data directory
 *
 * @example
 * const appPath = getAppPath('my-new-app');
 */
const getAppPath = (appId: string) => {
  const appName =
    process.env.NODE_ENV === 'production' ? appId : `${appId} (development)`;

  if (process.platform === 'win32') {
    return `${process.env.APPDATA}`;
  }

  if (process.platform === 'darwin') {
    return `${process.env.HOME}/Library/Application Support/${appName}/`;
  }

  return `${process.env.HOME}/${appName}/`;
};

/**
 * Returns the path to a file
 * @param fileName the file name
 * @returns the path to the file
 *
 * @example
 * const filePath = getFilePath('settings.json');
 */
const getFilePath = (appName: string, fileName: string) => {
  return `${getAppPath(appName)}${fileName}`;
};

/**
 * Ensures the path to a file exists
 * @param filePath the path to the file
 *
 * @example
 * await ensurePath(getFilePath('settings.json'));
 */
const ensurePath = async (appName: string, filePath: string) => {
  const exists = await fs.pathExists(filePath);
  if (exists) return;

  await fs.ensureDir(getAppPath(appName));
};

/**
 * Ensures that a file exists
 * @param filePath the path to the file
 * @param fileData the data that should be written to the file
 * @param jsonOptions options to use when calling JSON.stringify
 *
 * @example
 * await ensureFile(getFilePath('settings.json'), { theme: 'dark' }, { space: 2 });
 */
const ensureFile = async (
  appName: string,
  filePath: string,
  fileData: unknown,
  jsonOptions?: JSONOptions
) => {
  await ensurePath(appName, filePath);

  await fs.writeFile(
    filePath,
    JSON.stringify(
      fileData,
      jsonOptions?.replacer ?? null,
      jsonOptions?.space ?? 2
    )
  );
};

/**
 * Write data to a file
 * @param filePath the path to the file
 * @param fileData the data that should be written to the file
 * @param jsonOptions options to use when calling JSON.stringify
 */
const writeFile = async (
  filePath: string,
  fileData: unknown,
  jsonOptions?: JSONOptions
) => {
  await fs.writeFile(
    filePath,
    JSON.stringify(
      fileData,
      jsonOptions?.replacer ?? null,
      jsonOptions?.space ?? 2
    )
  );
};

/**
 * Read, parse, and validate data from a file
 * @param filePath the path to the file
 * @param schema the zod schema to use to parse the data
 * @param defaultData the default data to write if the file does not exist or the data does not pass validation
 * @returns the data from the file
 *
 * @example
 * const fileData = await readFile(
 *   getFilePath('settings.json'),
 *   z.object({ theme: z.enum(['light', 'dark']) }),
 *   { theme: 'light' }
 * );
 */
const readFile = async <T extends ZodType<any, any>>(
  filePath: string,
  schema: T,
  defaultData: z.infer<T>
) => {
  const fileData = await fs.promises.readFile(filePath, { encoding: 'utf-8' });

  try {
    const jsonData = JSON.parse(fileData);

    schema.parse(jsonData);

    return jsonData as z.infer<T>;
  } catch (err) {
    await restoreDefaults<T>(filePath, defaultData);

    return defaultData;
  }
};

/**
 * Restore default data to a file
 * @param filePath the path to the file
 * @param data the default data to write
 *
 * @example
 * await restoreDefaults(getFilePath('settings.json'), { theme: 'light' });
 */
const restoreDefaults = async function restoreDefaults<T>(
  filePath: string,
  data: T
) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));

  return data;
};

/**
 * FileHelper: a class to read, write, and update JSON files in a type-safe manner.
 *
 * @class
 */
class FileHelper<T extends ZodType<any, any>> {
  appName: string;
  fileName: string;
  schema: T;
  defaultValues: z.infer<T>;
  json?: JSONOptions;

  /**
   * Creates a new instance of the FileHelper class
   *
   * @param appName the name of the application
   * @param fileName the name of the file
   * @param schema the Zod schema that applies to the file
   * @param defaultValues the default values to be used for the file
   * @param json options to be used when calling JSON.stringify
   */
  constructor(
    appName: string,
    fileName: string,
    schema: T,
    defaultValues: z.infer<T>,
    json?: JSONOptions
  ) {
    this.appName = appName;
    this.fileName = fileName;
    this.schema = schema;
    this.defaultValues = defaultValues;

    if (this.json) this.json = json;
  }

  /**
   * Read data from a file
   */
  async read() {
    const filePath = getFilePath(this.appName, this.fileName);

    await ensureFile(this.appName, filePath, this.defaultValues, this.json);

    return readFile(filePath, this.schema, this.defaultValues);
  }

  /**
   * Write data to a file
   */
  async write(data: z.infer<T>) {
    this.schema.parse(data);

    const filePath = getFilePath(this.appName, this.fileName);

    await ensureFile(this.appName, filePath, this.defaultValues, this.json);

    await writeFile(filePath, data, this.json);
  }

  /**
   * Update a file entirely or partially, using a deep merge
   */
  async update(data: Partial<z.infer<T>>) {
    const filePath = getFilePath(this.appName, this.fileName);

    await ensureFile(this.appName, filePath, this.defaultValues, this.json);

    const fileData = await readFile(filePath, this.schema, this.defaultValues);

    const updatedData = deepMerge(fileData, data);

    this.schema.parse(updatedData);

    await writeFile(filePath, updatedData, this.json);
  }
}

/**
 * Create a zod-fs instance
 *
 * @param appName the name of your application
 *
 * @example
 * const dataHelper = createZodFs('my-first-app');
 *
 * const settingsHelper = dataHelper.createFileHelper(
 *   fileName: 'settings.json',
 *   schema: z.object({ theme: z.enum(['light', 'dark']) }),
 *   defaultValues: { theme: 'light' },
 *   json: { space: 2 }, // optional
 * );
 */
export const createZodFs = (appName: string) => {
  return {
    createFileHelper: <T extends ZodType<any, any>>({
      fileName,
      schema,
      defaultValues,
      json,
    }: CreateFileHelperOptions<T>) => {
      return new FileHelper(appName, fileName, schema, defaultValues, json);
    },
  };
};
