import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { AppService } from "./app.service";

interface HelloResponse {
  message: string;
  version: string;
  timestamp: string;
  docs: string;
}

interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
  environment: string;
  version: string;
  services: {
    database: string;
    messaging: string;
    websocket: string;
  };
}

@ApiTags("Health")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: "Health check endpoint" })
  @ApiResponse({ status: 200, description: "API is running" })
  getHello(): HelloResponse {
    return this.appService.getHello();
  }

  @Get("health")
  @ApiOperation({ summary: "Detailed health check" })
  @ApiResponse({ status: 200, description: "Health status" })
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }
}
