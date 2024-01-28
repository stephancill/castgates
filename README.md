# Private casts

## Development

Copy `.env.example` to `.env` and fill in the values.

```
yarn install
```

```
yarn prisma generate
```

Connect a postgres db via the `DATABASE_URL` environment variable and run `yarn prisma migrate dev` for local dev or `yarn prisma migrate deploy` for production.

```
yarn run dev
```
