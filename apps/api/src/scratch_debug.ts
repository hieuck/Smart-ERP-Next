import 'reflect-metadata';
import { WebhooksService } from './modules/webhooks/webhooks.service';
console.log('Paramtypes:', Reflect.getMetadata('design:paramtypes', WebhooksService));
