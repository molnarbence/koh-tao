import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const IDS = {
  partners: {
    acme: '018e0001-0000-7000-8000-000000000001',
    beta: '018e0001-0000-7000-8000-000000000002',
  },
  channels: {
    acmeManual: '018e0002-0000-7000-8000-000000000001',
    acmeSftp:   '018e0002-0000-7000-8000-000000000002',
    betaManual: '018e0002-0000-7000-8000-000000000003',
  },
  blueprints: {
    normalizeCsv:  '018e0003-0000-7000-8000-000000000001',
    normalizeXlsx: '018e0003-0000-7000-8000-000000000002',
  },
  ingestions: {
    acmeMay: '018e0004-0000-7000-8000-000000000001',
    betaMay: '018e0004-0000-7000-8000-000000000002',
  },
}

async function main() {
  await prisma.partner.upsert({
    where: { id: IDS.partners.acme },
    update: { name: 'Acme Corp' },
    create: { id: IDS.partners.acme, name: 'Acme Corp' },
  })

  await prisma.partner.upsert({
    where: { id: IDS.partners.beta },
    update: { name: 'Beta Industries' },
    create: { id: IDS.partners.beta, name: 'Beta Industries' },
  })

  await prisma.mediationBlueprint.upsert({
    where: { id: IDS.blueprints.normalizeCsv },
    update: { name: 'Normalize Usage CSV', functionIdentifier: 'normalize_usage_csv', parameterSchema: { delimiter: ';' } },
    create: { id: IDS.blueprints.normalizeCsv, name: 'Normalize Usage CSV', functionIdentifier: 'normalize_usage_csv', parameterSchema: { delimiter: ';' } },
  })

  await prisma.mediationBlueprint.upsert({
    where: { id: IDS.blueprints.normalizeXlsx },
    update: { name: 'Normalize Usage XLSX', functionIdentifier: 'normalize_usage_xlsx', parameterSchema: { sheetIndex: 0 } },
    create: { id: IDS.blueprints.normalizeXlsx, name: 'Normalize Usage XLSX', functionIdentifier: 'normalize_usage_xlsx', parameterSchema: { sheetIndex: 0 } },
  })

  await prisma.ingestionChannel.upsert({
    where: { id: IDS.channels.acmeManual },
    update: { channelType: 'manual_upload', isActive: true },
    create: { id: IDS.channels.acmeManual, partnerId: IDS.partners.acme, channelType: 'manual_upload', isActive: true },
  })

  await prisma.ingestionChannel.upsert({
    where: { id: IDS.channels.acmeSftp },
    update: { channelType: 'sftp', isActive: false },
    create: { id: IDS.channels.acmeSftp, partnerId: IDS.partners.acme, channelType: 'sftp', isActive: false },
  })

  await prisma.ingestionChannel.upsert({
    where: { id: IDS.channels.betaManual },
    update: { channelType: 'manual_upload', isActive: true },
    create: { id: IDS.channels.betaManual, partnerId: IDS.partners.beta, channelType: 'manual_upload', isActive: true },
  })

  await prisma.ingestion.upsert({
    where: { id: IDS.ingestions.acmeMay },
    update: { status: 'waiting_for_mediation' },
    create: {
      id: IDS.ingestions.acmeMay,
      partnerId: IDS.partners.acme,
      ingestionChannelId: IDS.channels.acmeManual,
      billingPeriodStart: new Date('2026-05-01'),
      status: 'waiting_for_mediation',
      sourceType: 'manual_upload',
      originalFilename: 'acme-usage-may-2026.xlsx',
    },
  })

  await prisma.ingestion.upsert({
    where: { id: IDS.ingestions.betaMay },
    update: { status: 'uploaded_to_billing_system' },
    create: {
      id: IDS.ingestions.betaMay,
      partnerId: IDS.partners.beta,
      ingestionChannelId: IDS.channels.betaManual,
      billingPeriodStart: new Date('2026-05-01'),
      status: 'uploaded_to_billing_system',
      sourceType: 'manual_upload',
      originalFilename: 'beta-usage-may-2026.csv',
    },
  })

  console.log('Seed complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
