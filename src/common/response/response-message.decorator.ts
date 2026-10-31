import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'kopikini:response_message';

/**
 * Menentukan field `message` pada Unified Response Envelope (TRD §4.1).
 * Contoh: `@ResponseMessage('Menu retrieved successfully')`.
 */
export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE_KEY, message);
