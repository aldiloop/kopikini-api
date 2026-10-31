import { IsJWT, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** `{"phone_number": "081234567890"}` (BSD §3). */
export class OtpRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone_number: string;
}

/** `{"phone_number": "...", "otp": "123456"}` (+ `full_name` untuk pengguna baru). */
export class OtpVerifyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone_number: string;

  @Matches(/^\d{6}$/, { message: 'otp must be exactly 6 digits' })
  otp: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  full_name?: string;
}

export class RefreshTokenDto {
  @IsJWT()
  refresh_token: string;
}
