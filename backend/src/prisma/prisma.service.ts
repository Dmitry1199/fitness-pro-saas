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

    // Визначаємо тип для делегата моделі Prisma, який має метод `deleteMany`.
    type ModelDelegateWithDeleteMany = {
      deleteMany: () => Promise<Prisma.BatchPayload>;
    };

    // Отримуємо всі ключі з `this` (екземпляра PrismaClient) та фільтруємо їх.
    const modelKeys = Object.keys(this).filter((key) => {
      // Спочатку звертаємося до властивості, приводячи `this` до `unknown`, а потім до `Record<string, unknown>`.
      // Це необхідно для відповідності TS2352, коли базовий тип (PrismaService) не має строкової індексної сигнатури.
      const prop = (this as unknown as Record<string, unknown>)[key];

      // Фільтруємо внутрішні властивості/методи Prisma, які починаються з '$' або '_',
      // та переконуємося, що властивість є об'єктом і має метод 'deleteMany'.
      return (
        !key.startsWith("$") &&
        !key.startsWith("_") &&
        typeof prop === "object" &&
        prop !== null && // Переконуємося, що властивість не є null
        "deleteMany" in prop && // Перевіряємо, чи існує властивість 'deleteMany' на об'єкті
        typeof (prop as ModelDelegateWithDeleteMany).deleteMany === "function" // Переконуємося, що 'deleteMany' є функцією
      );
    });

    // Мапуємо кожен відфільтрований ключ моделі на його обіцянку `deleteMany`.
    return Promise.all(
      modelKeys.map((modelKey) => {
        // Після фільтрації та перевірки типу, ми можемо безпечно привести `this` знову
        // до типу Record, який конкретно вказує на делегати моделі, дозволяючи доступ до `deleteMany`.
        const modelDelegate = (this as unknown as Record<string, ModelDelegateWithDeleteMany>)[modelKey];
        return modelDelegate.deleteMany();
      }),
    );
  }
}
