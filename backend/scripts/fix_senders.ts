import prisma from "../src/db";
import nodemailer from "nodemailer";

async function main() {
  const senders = await prisma.sender.findMany({
    where: {
      OR: [
        { etherealUser: null },
        { etherealPassword: null }
      ]
    }
  });

  console.log(`Found ${senders.length} senders with missing Ethereal credentials.`);

  for (const sender of senders) {
    console.log(`Generating credentials for sender ${sender.id}...`);
    const testAccount = await nodemailer.createTestAccount();
    await prisma.sender.update({
      where: { id: sender.id },
      data: {
        etherealUser: testAccount.user,
        etherealPassword: testAccount.pass
      }
    });
    console.log(`Updated sender ${sender.id} with new Ethereal account: ${testAccount.user}`);
  }

  console.log("Done fixing senders!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
