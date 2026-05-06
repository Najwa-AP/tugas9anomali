import 'dotenv/config';

// config 
export default {
    port: process.env.PORT || 4077,
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'db_mahasiswa_p9'
    }
};