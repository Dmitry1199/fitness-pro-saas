import { PrismaClient, UserRole, ChatRoomType, MessageType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.messageReaction.deleteMany();
  await prisma.messageRead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chatRoomParticipant.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  const trainer1 = await prisma.user.create({
    data: {
      email: 'john.trainer@fitnesspro.com',
      firstName: 'John',
      lastName: 'Smith',
      role: UserRole.TRAINER,
      profilePicture: 'https://randomuser.me/api/portraits/men/1.jpg',
    },
  });

  const trainer2 = await prisma.user.create({
    data: {
      email: 'sarah.trainer@fitnesspro.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: UserRole.TRAINER,
      profilePicture: 'https://randomuser.me/api/portraits/women/1.jpg',
    },
  });

  const client1 = await prisma.user.create({
    data: {
      email: 'mike.client@example.com',
      firstName: 'Mike',
      lastName: 'Brown',
      role: UserRole.CLIENT,
      profilePicture: 'https://randomuser.me/api/portraits/men/2.jpg',
    },
  });

  const client2 = await prisma.user.create({
    data: {
      email: 'anna.client@example.com',
      firstName: 'Anna',
      lastName: 'Davis',
      role: UserRole.CLIENT,
      profilePicture: 'https://randomuser.me/api/portraits/women/2.jpg',
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@fitnesspro.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      profilePicture: 'https://randomuser.me/api/portraits/men/3.jpg',
    },
  });

  console.log('✅ Users created');

  // Create direct chat between trainer and client
  const directChat1 = await prisma.chatRoom.create({
    data: {
      name: 'John Smith & Mike Brown',
      type: ChatRoomType.DIRECT,
      createdById: trainer1.id,
      participants: {
        createMany: {
          data: [
            { userId: trainer1.id },
            { userId: client1.id },
          ],
        },
      },
    },
  });

  const directChat2 = await prisma.chatRoom.create({
    data: {
      name: 'Sarah Johnson & Anna Davis',
      type: ChatRoomType.DIRECT,
      createdById: trainer2.id,
      participants: {
        createMany: {
          data: [
            { userId: trainer2.id },
            { userId: client2.id },
          ],
        },
      },
    },
  });

  // Create group chat
  const groupChat = await prisma.chatRoom.create({
    data: {
      name: 'Fitness Team Discussion',
      type: ChatRoomType.GROUP,
      description: 'General discussion for all team members',
      createdById: admin.id,
      participants: {
        createMany: {
          data: [
            { userId: admin.id },
            { userId: trainer1.id },
            { userId: trainer2.id },
            { userId: client1.id },
          ],
        },
      },
    },
  });

  // Create support chat
  const supportChat = await prisma.chatRoom.create({
    data: {
      name: 'Support - Anna Davis',
      type: ChatRoomType.SUPPORT,
      description: 'Support chat for client issues',
      createdById: admin.id,
      participants: {
        createMany: {
          data: [
            { userId: admin.id },
            { userId: client2.id },
          ],
        },
      },
    },
  });

  console.log('✅ Chat rooms created');

  // Create messages in direct chat 1
  const message1 = await prisma.message.create({
    data: {
      content: 'Hi Mike! Ready for your workout session tomorrow?',
      type: MessageType.TEXT,
      senderId: trainer1.id,
      chatRoomId: directChat1.id,
    },
  });

  const message2 = await prisma.message.create({
    data: {
      content: 'Absolutely! Looking forward to it. What time again?',
      type: MessageType.TEXT,
      senderId: client1.id,
      chatRoomId: directChat1.id,
    },
  });

  const message3 = await prisma.message.create({
    data: {
      content: '9 AM sharp. Don\'t forget to bring your water bottle and towel!',
      type: MessageType.TEXT,
      senderId: trainer1.id,
      chatRoomId: directChat1.id,
      replyToId: message2.id,
    },
  });

  // Create messages in direct chat 2
  await prisma.message.create({
    data: {
      content: 'Anna, great progress on your cardio today! 💪',
      type: MessageType.TEXT,
      senderId: trainer2.id,
      chatRoomId: directChat2.id,
    },
  });

  await prisma.message.create({
    data: {
      content: 'Thank you Sarah! I feel much stronger already',
      type: MessageType.TEXT,
      senderId: client2.id,
      chatRoomId: directChat2.id,
    },
  });

  // Create messages in group chat
  await prisma.message.create({
    data: {
      content: 'Welcome everyone to our fitness team chat! 🏋️‍♂️',
      type: MessageType.TEXT,
      senderId: admin.id,
      chatRoomId: groupChat.id,
    },
  });

  await prisma.message.create({
    data: {
      content: 'Excited to be part of this team!',
      type: MessageType.TEXT,
      senderId: client1.id,
      chatRoomId: groupChat.id,
    },
  });

  await prisma.message.create({
    data: {
      content: 'Let\'s achieve our fitness goals together! 💯',
      type: MessageType.TEXT,
      senderId: trainer1.id,
      chatRoomId: groupChat.id,
    },
  });

  // Create messages in support chat
  await prisma.message.create({
    data: {
      content: 'Hi Anna, I see you have a question about your membership. How can I help?',
      type: MessageType.TEXT,
      senderId: admin.id,
      chatRoomId: supportChat.id,
    },
  });

  await prisma.message.create({
    data: {
      content: 'Yes, I\'m wondering about upgrading to the premium plan',
      type: MessageType.TEXT,
      senderId: client2.id,
      chatRoomId: supportChat.id,
    },
  });

  console.log('✅ Messages created');

  // Add message reactions
  await prisma.messageReaction.create({
    data: {
      messageId: message1.id,
      userId: client1.id,
      reaction: '👍',
    },
  });

  await prisma.messageReaction.create({
    data: {
      messageId: message3.id,
      userId: client1.id,
      reaction: '✅',
    },
  });

  // Mark some messages as read
  await prisma.messageRead.create({
    data: {
      messageId: message1.id,
      userId: client1.id,
    },
  });

  await prisma.messageRead.create({
    data: {
      messageId: message2.id,
      userId: trainer1.id,
    },
  });

  console.log('✅ Message interactions created');

  console.log('🎉 Database seeded successfully!');
  console.log('\n📊 Created:');
  console.log(`   - ${await prisma.user.count()} users`);
  console.log(`   - ${await prisma.chatRoom.count()} chat rooms`);
  console.log(`   - ${await prisma.message.count()} messages`);
  console.log(`   - ${await prisma.messageReaction.count()} reactions`);
  console.log(`   - ${await prisma.messageRead.count()} read receipts`);

  console.log('\n👥 Test Users:');
  console.log('   - john.trainer@fitnesspro.com (Trainer)');
  console.log('   - sarah.trainer@fitnesspro.com (Trainer)');
  console.log('   - mike.client@example.com (Client)');
  console.log('   - anna.client@example.com (Client)');
  console.log('   - admin@fitnesspro.com (Admin)');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
