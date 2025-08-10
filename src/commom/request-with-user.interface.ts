import type { Request } from "express";

// Цей інтерфейс описує структуру об'єкта користувача,
// який додається до запиту після автентифікації.
export interface UserPayload {
  userId: string;
  email: string;
  // Додайте будь-які інші властивості, які є у вашому об'єкті користувача
  // наприклад: roles: string[];
}

// Цей інтерфейс розширює стандартний Request і додає властивість 'user'
// з типом UserPayload.
export interface RequestWithUser extends Request {
  user: UserPayload;
}
