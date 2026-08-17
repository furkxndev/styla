import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { WeatherQueryDto } from './dto/weather-query.dto';
import type { WeatherSnapshot } from '../../common/types/domain.types';

@ApiTags('weather')
@ApiBearerAuth()
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  @ApiOperation({
    summary: 'Anlık hava durumu',
    description:
      'Koordinat veya şehir adına göre güncel hava durumunu ve 12 saatlik tahmini döner. ' +
      'Hiçbir parametre verilmezse varsayılan konum (İstanbul) kullanılır.',
  })
  async getCurrent(@Query() query: WeatherQueryDto): Promise<WeatherSnapshot> {
    return this.weatherService.getCurrent({
      latitude: query.lat,
      longitude: query.lon,
      city: query.city,
    });
  }
}
