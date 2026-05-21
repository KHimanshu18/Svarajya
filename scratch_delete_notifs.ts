import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.notification.deleteMany({});
    console.log('Deleted all notifications');
}

main().catch(console.error).finally(() => prisma.$disconnect());
