import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../config/app-config.service';
import { OtpSender } from '../domain/auth.ports';
import { maskPhone } from '../domain/phone';

/**
 * Pengirim OTP untuk development: hanya menulis ke log server, tidak mengirim
 * WhatsApp/SMS sungguhan. Provider nyata (mis. WhatsApp Business API) belum dipilih
 * dan butuh akun + kredensial, sehingga sengaja tidak diimplementasikan di Fase 1.
 * Di production, sender ini menolak berjalan agar tidak diam-diam "berhasil".
 */
@Injectable()
export class ConsoleOtpSender implements OtpSender {
  private readonly logger = new Logger('OtpSender');

  constructor(private readonly config: AppConfigService) {}

  async send(phoneNumber: string, code: string): Promise<void> {
    if (this.config.isProduction) {
      throw new Error('No real OTP provider configured for production');
    }
    this.logger.log(`[DEV] OTP for ${maskPhone(phoneNumber)}: ${code}`);
  }
}
