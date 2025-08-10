import {
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express"; // Import Request from 'express' to ensure correct base type
import type {
  JwtPayload,
  RequestWithUser,
} from "../../common/interfaces/request-with-user.interface"; // Adjust path as needed

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private jwtService: JwtService) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // Cast the request to RequestWithUser to ensure TypeScript knows about `request.user`
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    try {
      // Explicitly type the payload from jwtService.verify
      const payload: JwtPayload = this.jwtService.verify(token);
      request.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      return true;
    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }

  // Use the standard Express Request type here, or RequestWithUser if you prefer
  // Using Request is fine as we only access headers, but RequestWithUser is also valid.
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
