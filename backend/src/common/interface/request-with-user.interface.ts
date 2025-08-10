import { Request } from 'express'; // Імпорт Request з 'express'

// Визначає структуру корисного навантаження JWT після перевірки
// Зверніть увагу на 'export'
export interface JwtPayload {
  sub: string; // Зазвичай це ID користувача
  email: string;
  role: string; // Додано властивість 'role'
  // Додайте будь-які інші властивості, які може містити ваше корисне навантаження JWT
}

// Розширює стандартний інтерфейс Request для включення властивості 'user'
export interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: string; // Додано властивість 'role' до UserPayload
  };
}