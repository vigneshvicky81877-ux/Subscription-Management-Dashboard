import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    name: 'Free',
    description: 'Everything you need to explore the platform.',
    price: '0.00',
    durationDays: 30,
    sortOrder: 1,
    features: ['1 project', '500 MB storage', 'Community support', 'Basic analytics'],
  },
  {
    name: 'Basic',
    description: 'For individuals and freelancers getting serious.',
    price: '499.00',
    durationDays: 30,
    sortOrder: 2,
    features: [
      '5 projects',
      '10 GB storage',
      'Email support',
      'Standard analytics',
      'Custom domain',
    ],
  },
  {
    name: 'Pro',
    description: 'For growing teams that need more power.',
    price: '1499.00',
    durationDays: 30,
    sortOrder: 3,
    isPopular: true,
    features: [
      'Unlimited projects',
      '100 GB storage',
      'Priority email & chat support',
      'Advanced analytics',
      'Up to 10 team members',
      'API access',
    ],
  },
  {
    name: 'Enterprise',
    description: 'Annual plan with security and scale for organisations.',
    price: '49999.00',
    durationDays: 365,
    sortOrder: 4,
    features: [
      'Unlimited projects',
      '1 TB storage',
      'Dedicated account manager',
      'SSO & audit logs',
      'Unlimited team members',
      '99.9% uptime SLA',
    ],
  },
];

async function seedPlans() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
  }
  console.log(`Seeded ${plans.length} plans`);
}

async function seedUser({ name, email, password, role }) {
  if (!email || !password) return;
  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { name, role },
    create: { name, email: email.toLowerCase(), password: hashed, role },
  });
  console.log(`Seeded ${role} user: ${email}`);
}

async function main() {
  await seedPlans();
  // Demo accounts for local development only. Configure via .env.
  await seedUser({
    name: 'Admin User',
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
    role: 'ADMIN',
  });
  await seedUser({
    name: 'Demo User',
    email: process.env.SEED_USER_EMAIL,
    password: process.env.SEED_USER_PASSWORD,
    role: 'USER',
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
