import { Controller, Post, Body, HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Controller('ai')
export class AiController {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  @Post('forecast')
  async getForecast(@Body() body: any) {
    const aiUrl = this.configService.get('AI_FORECAST_URL') || 'http://localhost:8001';
    const response = await firstValueFrom(
      this.httpService.post(`${aiUrl}/forecast`, body),
    );
    return response.data;
  }
}
