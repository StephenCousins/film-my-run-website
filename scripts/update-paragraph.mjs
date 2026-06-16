import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const post = await prisma.posts.findUnique({ where: { id: 253 }, select: { content: true } });

const oldText = `I walked out from Eastbourne Sports Park along the route, waiting to meet Mark and Dave for the final stretch. And there, sitting on a bench at the finish, was Mark Perkins himself. He'd come to watch. He'd been dot-watching all day, and he'd had an inkling it would be Mark Derbyshire who finally took his record. Eleven years he'd held it. He seemed genuinely pleased to be passing it on.`;

const newText = `At Eastbourne Sports Park, sitting on a bench by the finish, was Mark Perkins himself. He'd come to watch. He'd been dot-watching all day, and he'd had an inkling it would be Mark Derbyshire who finally took his record. Eleven years he'd held it. He seemed genuinely pleased to be passing it on.</p>\n\n<p>I walked out from the Sports Park along the route to meet Mark Derbyshire coming in for the final stretch.`;

const updated = post.content.replace(oldText, newText);
await prisma.posts.update({ where: { id: 253 }, data: { content: updated, updated_at: new Date() } });
console.log('Updated.');
await prisma.$disconnect();
