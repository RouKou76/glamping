import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

const connectionString = 'postgresql://glamping:glamping_secret@localhost:5433/glamping?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create roles
  const roles = [
    { name: 'admin', permissions: ['manage_users', 'manage_houses', 'manage_services', 'manage_menu', 'manage_catalog', 'manage_info', 'manage_chat', 'manage_roles', 'manage_settings', 'manage_tickets', 'view_tickets'] },
  ];

  const roleMap: Record<string, string> = {};
  for (const role of roles) {
    const r = await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions },
      create: role,
    });
    roleMap[role.name] = r.id;
  }

  // Create users
  const passwordHash = await argon2.hash('admin123');
  const users = [
    { login: 'admin', name: 'Admin', roleName: 'admin' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { login: user.login },
      update: {},
      create: {
        login: user.login,
        passwordHash,
        name: user.name,
        roleId: roleMap[user.roleName],
      },
    });
  }

  // Create houses
  for (let i = 1; i <= 8; i++) {
    await prisma.house.upsert({
      where: { number: i },
      update: {},
      create: { number: i },
    });
  }

  // Create menu items
  const menuItems = [
    // Завтрак — Основные блюда
    { name: 'Оладьи со сметаной и джемом', category: 'breakfast', subcat: 'main', price: 123 },
    { name: 'Омлет с сыром и помидорами', category: 'breakfast', subcat: 'main', price: 123 },
    { name: 'Каша геркулесовая с маслом', category: 'breakfast', subcat: 'main', price: 123 },
    { name: 'Комплект сосисок микс', category: 'breakfast', subcat: 'main', price: 123 },
    // Завтрак — Напитки
    { name: 'Чай черный', category: 'breakfast', subcat: 'drinks', price: 123 },
    { name: 'Чай зеленый', category: 'breakfast', subcat: 'drinks', price: 123 },
    { name: 'Кофе', category: 'breakfast', subcat: 'drinks', price: 123 },
    { name: 'Горячий шоколад', category: 'breakfast', subcat: 'drinks', price: 123 },
    // Обед — Закуски
    { name: 'Салат из свежих овощей с сыром фета', category: 'lunch', subcat: 'appetizers', price: 123 },
    { name: 'Винегрет', category: 'lunch', subcat: 'appetizers', price: 123 },
    // Обед — Первое
    { name: 'Уха по-финский с лососем', category: 'lunch', subcat: 'first', price: 123 },
    { name: 'Суп вермишелевый', category: 'lunch', subcat: 'first', price: 123 },
    // Обед — Горячее
    { name: 'Бифстроганов из индейки', category: 'lunch', subcat: 'hot', price: 123 },
    { name: 'Шницель венский', category: 'lunch', subcat: 'hot', price: 123 },
    // Обед — Гарнир
    { name: 'Рис', category: 'lunch', subcat: 'sides', price: 123 },
    { name: 'Пюре картофельное', category: 'lunch', subcat: 'sides', price: 123 },
    // Обед — Напитки
    { name: 'Чай черный', category: 'lunch', subcat: 'drinks', price: 123 },
    { name: 'Чай зеленый', category: 'lunch', subcat: 'drinks', price: 123 },
    { name: 'Компот ягодный микс', category: 'lunch', subcat: 'drinks', price: 123 },
    { name: 'Горячий шоколад', category: 'lunch', subcat: 'drinks', price: 123 },
    // Ужин — Закуски
    { name: 'Салат овощной с зеленью', category: 'dinner', subcat: 'appetizers', price: 123 },
    { name: 'Цезарь с креветками', category: 'dinner', subcat: 'appetizers', price: 123 },
    // Ужин — Горячее
    { name: 'Крылышки запеченые', category: 'dinner', subcat: 'hot', price: 123 },
    { name: 'Люля-кебаб мясо микс', category: 'dinner', subcat: 'hot', price: 123 },
    // Ужин — Гарнир
    { name: 'Рис', category: 'dinner', subcat: 'sides', price: 123 },
    { name: 'Картофель по-деревенски', category: 'dinner', subcat: 'sides', price: 123 },
    // Ужин — Десерт
    { name: 'Торт птичье молоко', category: 'dinner', subcat: 'desserts', price: 123 },
    { name: 'Десерт тирамису', category: 'dinner', subcat: 'desserts', price: 123 },
    // Ужин — Напитки
    { name: 'Чай черный', category: 'dinner', subcat: 'drinks', price: 123 },
    { name: 'Чай зеленый', category: 'dinner', subcat: 'drinks', price: 123 },
    { name: 'Компот ягодный микс', category: 'dinner', subcat: 'drinks', price: 123 },
    { name: 'Горячий шоколад', category: 'dinner', subcat: 'drinks', price: 123 },
  ];

  for (const item of menuItems) {
    const existing = await prisma.menuItem.findFirst({ where: { name: item.name, category: item.category as any } });
    if (!existing) {
      await prisma.menuItem.create({
        data: {
          name: item.name,
          category: item.category as any,
          subcat: item.subcat as any,
          price: item.price,
        },
      });
    } else if (item.subcat && !existing.subcat) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: { subcat: item.subcat as any },
      });
    }
  }

  // Create services
  const services = [
    {
      name: 'Катание на квадроциклах',
      price: '4 000 – 6 000 ₽ / час',
      icon: '🏍️',
      active: true,
      assignedTo: 'admin',
      fields: {
        booking: true,
        bookingSlots: ['10:00', '12:00', '14:00', '16:00'],
        bookingLimit: 2,
        desiredAt: { enabled: true, label: 'Выберите время' },
        guestCount: { enabled: true, label: 'Количество человек' },
        comment: { enabled: true },
        showDescription: true,
        description: 'Прокат одного Квадроцикла 6000 руб./час, от двух квадроциклов 4000 руб./час. Экипировка инструктаж, фото/видеосьемка входят в стоимость.',
      },
    },
  ];

  for (const svc of services) {
    const existing = await prisma.service.findFirst({ where: { name: svc.name } });
    if (existing) {
      await prisma.service.update({ where: { id: existing.id }, data: { ...svc, assignedTo: svc.assignedTo as any } });
    } else {
      await prisma.service.create({ data: { ...svc, assignedTo: svc.assignedTo as any } });
    }
  }

  // Create transfer destinations
  const transfersPath = require('path').join(__dirname, '..', '..', 'scripts', 'transfers-seed.json')
  const transfersRaw = require('fs').readFileSync(transfersPath, 'utf8')
  const destinations = JSON.parse(transfersRaw.split('\n').slice(1).join('\n'))

  await prisma.transferDestination.deleteMany()
  await prisma.transferDestination.createMany({ data: destinations, skipDuplicates: true })
  console.log(`Seeded ${destinations.length} transfer destinations`)

  // Create settings
  const settings = [
    { key: 'title', value: 'Глэмпинг "Бренандетта"' },
    { key: 'phone', value: '+7 (999) 123-45-67' },
    { key: 'wifi_name', value: 'Glamp_Guest' },
    { key: 'wifi_password', value: 'forest2026' },
    { key: 'rules', value: '• Тихий час с 23:00 до 8:00\n• Курение только в отведённых местах\n• Выезд до 12:00' },
    { key: 'description', value: 'Добро пожаловать в наш глэмпинг! Здесь вы сможете насладиться природой без отрыва от комфорта.' },
    { key: 'services_text', value: 'Мы предоставляем: питание по меню, услуги трансфера, уборку домиков, пополнение мини-бара и свежие полотенца по запросу.' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
