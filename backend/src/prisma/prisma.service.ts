import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { type Prisma, PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: ["query", "info", "warn", "error"],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log("✅ Database connected successfully");
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log("❌ Database disconnected");
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === "production") return;

    // Визначимо тип для властивості, яка може бути делегатом моделі Prisma
    // (тобто має метод `deleteMany`).
    type PossibleModelDelegate = {
      deleteMany: () => Promise<Prisma.BatchPayload>;
    };

    // Отримуємо всі ключі з екземпляра PrismaClient (this)
    const modelKeys = Object.keys(this).filter((key) => {
      // Доступ до властивості за ключем, спочатку вважаючи її тип `unknown`.
      // Це дозволяє безпечно індексувати об'єкт за рядковим ключем без використання 'any'.
      const prop = (this as Record<string, unknown>)[key];

      // Фільтруємо внутрішні властивості Prisma (що починаються з '$' або '_')
      // та перевіряємо, чи є властивість об'єктом і чи має вона метод 'deleteMany'.
      return (
        !key.startsWith("$") && // Виключаємо внутрішні методи Prisma ($connect, $disconnect тощо)
        !key.startsWith("_") && // Виключаємо внутрішні властивості Prisma
        typeof prop === "object" && // Перевіряємо, чи є властивість об'єктом
        prop !== null && // Перевіряємо, що об'єкт не є null
        typeof (prop as PossibleModelDelegate).deleteMany === "function" // Перевіряємо, чи є 'deleteMany' функцією
      );
    });

    // Мапуємо відфільтровані ключі, щоб викликати `deleteMany()` на кожному делегаті моделі.
    return Promise.all(
      modelKeys.map((modelKey) => {
        // Тепер, після ретельної фільтрації, ми можемо впевнено перетворити властивість
        // на наш допоміжний тип `PossibleModelDelegate`, оскільки ми знаємо,
        // що вона має метод `deleteMany`.
        const modelDelegate = (this as Record<string, PossibleModelDelegate>)[
          modelKey
        ];
        return modelDelegate.deleteMany(); // Викликаємо метод `deleteMany`
      }),
    );
  }
}
