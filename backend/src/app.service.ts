import { Injectable } from "@nestjs/common"; // <--- Add this import

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

@Injectable()
export class AppService {
  getHello(): HelloResponse {
    return {
      message: "FitnessPro SaaS Backend API is running! 🚀",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      docs: "/api/docs",
    };
  }

  getHealth(): HealthResponse {
    return {
      status: "healthy",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
      services: {
        database: "connected", // This would be checked in real implementation
        messaging: "active",
        websocket: "running",
      },
    };
  }
}