import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || '',
  },

  jwt: {
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || 'dev-access-secret',
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret',
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  },

  systemUserId: process.env.SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000000',

  superAdmin: {
    phone: process.env.SUPER_ADMIN_PHONE || '9999999999',
    password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  },
} as const;
