# Create T3 App - Order Tracking Management

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## The Problem

When using Nuvemshop + Magis5 for online sales management:
1. The system generates tracking codes and updates status as "shipped"
2. However, actual shipping happens 1-2 days after code generation
3. This discrepancy needs monitoring and correction

## User Stories

**As a sales manager, I want to:**
- Upload order CSVs from Nuvemshop
- Check which orders are actually shipped
- Fix order statuses that aren't actually shipped yet

**Flow:**
1. User authenticates
2. Uploads CSV file
3. System validates tracking codes
4. Shows a list of orders with actual shipping status

## CSV Structure

The system accepts Nuvemshop CSV files with these required fields:
```csv
Número do Pedido,Status do Envio,Código de rastreio do envio
```

---

The rest of README remains unchanged...

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
