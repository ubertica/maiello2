// Agent: Data & ORM - Database Seed Script

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@maiello.com',
      password: adminPassword,
      name: 'System Administrator',
      role: 'admin'
    }
  });
  console.log('✅ Created admin user');

  // Create demo users
  const userPassword = await hashPassword('user123');
  const demoUsers = [
    {
      username: 'john_sales',
      email: 'john@maiello.com',
      password: userPassword,
      name: 'John Sales',
      role: 'user'
    },
    {
      username: 'sarah_manager',
      email: 'sarah@maiello.com',
      password: userPassword,
      name: 'Sarah Manager',
      role: 'user'
    }
  ];

  for (const userData of demoUsers) {
    await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: userData
    });
  }
  console.log('✅ Created demo users');

  // Create subscription plans
  const plans = [
    {
      name: 'Free',
      description: 'Basic lead management for small teams',
      type: 'free',
      price: 0,
      yearlyPrice: 0,
      features: [
        'Up to 100 leads',
        'Basic lead management',
        'Email support',
        'Standard templates'
      ],
      maxLeads: 100,
      maxUsers: 2,
      isActive: true
    },
    {
      name: 'Professional',
      description: 'Advanced features for growing businesses',
      type: 'professional',
      price: 29.99,
      yearlyPrice: 299.99,
      features: [
        'Up to 1,000 leads',
        'Advanced lead scoring',
        'Custom fields',
        'Priority support',
        'API access',
        'Export capabilities'
      ],
      maxLeads: 1000,
      maxUsers: 10,
      isActive: true
    },
    {
      name: 'Enterprise',
      description: 'Full-featured solution for large organizations',
      type: 'enterprise',
      price: 99.99,
      yearlyPrice: 999.99,
      features: [
        'Unlimited leads',
        'AI-powered lead scoring',
        'Custom integrations',
        'Dedicated support',
        'Advanced analytics',
        'White-label options',
        'SSO integration'
      ],
      maxLeads: null,
      maxUsers: null,
      isActive: true
    }
  ];

  for (const planData of plans) {
    await prisma.plan.upsert({
      where: { name: planData.name },
      update: {},
      create: planData
    });
  }
  console.log('✅ Created subscription plans');

  // Create sample leads
  const sampleLeads = [
    {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@techcorp.com',
      phone: '+1-555-0101',
      company: 'TechCorp Solutions',
      jobTitle: 'CTO',
      status: 'new',
      source: 'website',
      priority: 'high',
      budget: 25000,
      probability: 75,
      notes: 'Interested in enterprise solution. Has immediate need.',
      tags: ['enterprise', 'tech', 'high-value'],
      assignedToId: admin.id
    },
    {
      firstName: 'Bob',
      lastName: 'Wilson',
      email: 'bob.wilson@designstudio.com',
      phone: '+1-555-0102',
      company: 'Creative Design Studio',
      jobTitle: 'Marketing Director',
      status: 'contacted',
      source: 'referral',
      priority: 'medium',
      budget: 5000,
      probability: 50,
      notes: 'Looking for design tools integration.',
      tags: ['design', 'marketing', 'mid-market']
    },
    {
      firstName: 'Carol',
      lastName: 'Davis',
      email: 'carol.davis@startup.io',
      phone: '+1-555-0103',
      company: 'StartupFlow',
      jobTitle: 'CEO',
      status: 'qualified',
      source: 'trade_show',
      priority: 'high',
      budget: 15000,
      probability: 80,
      notes: 'Fast-growing startup, decision maker.',
      tags: ['startup', 'ceo', 'fast-growth']
    },
    {
      firstName: 'David',
      lastName: 'Brown',
      email: 'david.brown@consulting.com',
      phone: '+1-555-0104',
      company: 'Brown Consulting',
      jobTitle: 'Principal Consultant',
      status: 'proposal',
      source: 'organic_search',
      priority: 'medium',
      budget: 8000,
      probability: 65,
      notes: 'Reviewing proposal, follow up next week.',
      tags: ['consulting', 'professional-services']
    },
    {
      firstName: 'Emma',
      lastName: 'Martinez',
      email: 'emma.martinez@retailchain.com',
      phone: '+1-555-0105',
      company: 'RetailChain Inc',
      jobTitle: 'IT Director',
      status: 'negotiation',
      source: 'email_campaign',
      priority: 'high',
      budget: 35000,
      probability: 90,
      notes: 'In final negotiations, very interested.',
      tags: ['retail', 'enterprise', 'hot-lead']
    },
    {
      firstName: 'Frank',
      lastName: 'Lee',
      email: 'frank.lee@manufacturing.com',
      phone: '+1-555-0106',
      company: 'Lee Manufacturing',
      jobTitle: 'Operations Manager',
      status: 'nurturing',
      source: 'cold_call',
      priority: 'low',
      budget: 3000,
      probability: 30,
      notes: 'Not ready yet, keep in touch quarterly.',
      tags: ['manufacturing', 'long-term']
    }
  ];

  for (const leadData of sampleLeads) {
    await prisma.lead.upsert({
      where: { email: leadData.email },
      update: {},
      create: leadData
    });
  }
  console.log('✅ Created sample leads');

  // Create lead activities for some leads
  const leads = await prisma.lead.findMany();
  
  const activities = [
    {
      leadId: leads[0].id,
      type: 'email',
      subject: 'Welcome email sent',
      description: 'Sent welcome email with company overview',
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      leadId: leads[0].id,
      type: 'call',
      subject: 'Discovery call',
      description: 'Initial discovery call - 30 minutes. Very positive response.',
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      leadId: leads[1].id,
      type: 'email',
      subject: 'Follow-up email',
      description: 'Sent follow-up email after initial contact',
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
      leadId: leads[2].id,
      type: 'meeting',
      subject: 'Product demo',
      description: 'Conducted product demo - very engaged',
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  ];

  for (const activityData of activities) {
    await prisma.leadActivity.create({
      data: activityData
    });
  }
  console.log('✅ Created lead activities');

  // Create sample ebook
  await prisma.ebook.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'The Ultimate Guide to Lead Management',
      description: 'A comprehensive guide to managing and converting leads effectively',
      coverImage: '/images/ebook-cover.jpg',
      price: '29.99',
      salePrice: '19.99',
      buyLink: 'https://checkout.stripe.com/pay/example',
      features: [
        'Lead scoring strategies',
        'Conversion optimization',
        'CRM best practices',
        'Automation workflows',
        'Case studies'
      ]
    }
  });
  console.log('✅ Created sample ebook');

  // Create sample blog posts
  const blogPosts = [
    {
      title: 'How to Score Leads Effectively',
      slug: 'how-to-score-leads-effectively',
      content: 'Lead scoring is crucial for prioritizing your sales efforts...',
      excerpt: 'Learn the fundamentals of lead scoring and how to implement it in your business.',
      featuredImage: '/images/blog/lead-scoring.jpg',
      authorId: admin.id,
      published: true
    },
    {
      title: 'The Future of AI in Sales',
      slug: 'future-of-ai-in-sales',
      content: 'Artificial Intelligence is revolutionizing how we approach sales...',
      excerpt: 'Discover how AI is transforming the sales landscape and what it means for your business.',
      featuredImage: '/images/blog/ai-sales.jpg',
      authorId: admin.id,
      published: true
    }
  ];

  for (const postData of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: postData.slug },
      update: {},
      create: postData
    });
  }
  console.log('✅ Created sample blog posts');

  // Create hero settings
  await prisma.heroSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'Transform Your Lead Management',
      subtitle: 'AI-powered lead scoring and management for modern businesses',
      backgroundImage: '/images/hero-bg.jpg',
      buttonText1: 'Get Started Free',
      buttonLink1: '/register',
      buttonText2: 'Learn More',
      buttonLink2: '/about',
      imagePosition: 'center center',
      imageScale: 1.0
    }
  });
  console.log('✅ Created hero settings');

  // Create sample events
  const events = [
    {
      title: 'Lead Management Masterclass',
      venue: 'Business Center Downtown',
      location: 'New York, NY',
      date: '15',
      month: 'Mar',
      time: '2:00 PM EST',
      image: '/images/events/masterclass.jpg',
      ticketUrl: 'https://eventbrite.com/example1',
      eventType: 'workshop'
    },
    {
      title: 'Sales Technology Summit',
      venue: 'Convention Center',
      location: 'San Francisco, CA',
      date: '22',
      month: 'Apr',
      time: '9:00 AM PST',
      image: '/images/events/summit.jpg',
      ticketUrl: 'https://eventbrite.com/example2',
      eventType: 'event'
    }
  ];

  for (const eventData of events) {
    await prisma.event.create({
      data: eventData
    });
  }
  console.log('✅ Created sample events');

  console.log('🎉 Database seeding completed!');
  console.log('\n📊 Summary:');
  console.log(`- Users: ${await prisma.user.count()}`);
  console.log(`- Leads: ${await prisma.lead.count()}`);
  console.log(`- Plans: ${await prisma.plan.count()}`);
  console.log(`- Blog Posts: ${await prisma.blogPost.count()}`);
  console.log(`- Events: ${await prisma.event.count()}`);
  console.log(`- Activities: ${await prisma.leadActivity.count()}`);
  
  console.log('\n🔐 Admin Login:');
  console.log('Username: admin');
  console.log('Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });