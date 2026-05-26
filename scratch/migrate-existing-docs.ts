import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SVARAJYA BACKFILL: STARTING MIGRATION ---');

  // 1. Backfill existing IdentityRecords
  console.log('Backfilling existing IdentityRecord entries (setting familyMemberId to null representing Myself)...');
  const identityRecords = await prisma.identityRecord.updateMany({
    where: {
      familyMemberId: {
        equals: null,
      },
    },
    data: {
      familyMemberId: null, // Force null explicitly to avoid any schema undefined issues
    },
  });
  console.log(`Successfully backfilled ${identityRecords.count} IdentityRecord entries.`);

  // 2. Backfill existing DocumentMetas
  console.log('Backfilling existing DocumentMeta entries (setting linkedFamilyMemberId to null representing Myself)...');
  const documentMetas = await prisma.documentMeta.updateMany({
    where: {
      linkedFamilyMemberId: {
        equals: null,
      },
    },
    data: {
      linkedFamilyMemberId: null,
    },
  });
  console.log(`Successfully backfilled ${documentMetas.count} DocumentMeta entries.`);

  console.log('--- SVARAJYA BACKFILL: COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error('Error executing backfill migration script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
