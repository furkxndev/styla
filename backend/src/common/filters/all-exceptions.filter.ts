import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/**
 * Tüm hataları tek bir gövde şekline indirger.
 * Beklenmeyen hataların detayı yalnızca log'a yazılır; istemciye sızmaz.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    const body =
      exception instanceof HttpException
        ? this.fromHttpException(exception, request.url)
        : this.fromUnknown(request.url);

    if (!(exception instanceof HttpException)) {
      const error = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(
        `${request.method} ${request.url} - beklenmeyen hata: ${error.message}`,
        error.stack,
      );
    } else if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} - ${JSON.stringify(body.message)}`);
    }

    response.status(body.statusCode).json(body);
  }

  private fromHttpException(exception: HttpException, path: string): ErrorBody {
    const status = exception.getStatus();
    const payload = exception.getResponse();

    // ValidationPipe dizi mesaj döner; string atanmış özel hatalar da olabilir.
    let message: string | string[] = exception.message;
    let error = HttpStatus[status] ?? 'Error';

    if (typeof payload === 'string') {
      message = payload;
    } else if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      if (typeof record.message === 'string' || Array.isArray(record.message)) {
        message = record.message as string | string[];
      }
      if (typeof record.error === 'string') {
        error = record.error;
      }
    }

    return {
      statusCode: status,
      message,
      error,
      path,
      timestamp: new Date().toISOString(),
    };
  }

  private fromUnknown(path: string): ErrorBody {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Sunucuda beklenmeyen bir hata oluştu',
      error: 'Internal Server Error',
      path,
      timestamp: new Date().toISOString(),
    };
  }
}
