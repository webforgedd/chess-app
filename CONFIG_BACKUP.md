# Keep your Supabase config safe

Every time you copy a new `src` folder into your project, `src/online/config.ts` gets overwritten back
to placeholder values, because that file lives inside `src`.

After every update, reopen `src/online/config.ts` and paste your two values back in:

```ts
export const SUPABASE_URL = 'https://ozndlgfqspmgmeicmqml.supabase.co';
export const SUPABASE_ANON_KEY = 'PASTE_YOUR_KEY_HERE';
```

Tip: keep a copy of these two lines saved in a text file on your desktop, so you can paste them back in seconds.
