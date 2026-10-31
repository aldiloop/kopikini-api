import { Global, Module } from '@nestjs/common';

/** Sumber waktu yang dapat di-mock dalam test. */
export const CLOCK = Symbol('CLOCK');
export type Clock = () => Date;

@Global()
@Module({
  providers: [{ provide: CLOCK, useValue: (() => new Date()) as Clock }],
  exports: [CLOCK],
})
export class ClockModule {}
