import { CorsOptions } from 'cors';

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_LOCAL_URL || 'http://localhost:3000',
      process.env.FRONTEND_SERVER_URL, // This should be your ALB DNS name
      'http://127.0.0.1:3000'
    ].filter(Boolean) as string[];

    // 1. Allow same-origin requests (no origin header)
    // 2. Allow our specific frontend URL
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // 3. Block everyone else
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

export default corsOptions;
