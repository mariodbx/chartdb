import pg from 'pg';
import mysql from 'mysql2/promise';
import { parseConnectionString } from './connection-parser.js';
import {
    getPostgresQuery,
    getMySQLQuery,
    getSqlServerQuery,
} from './queries/index.js';

const { Client: PgClient } = pg;

/**
 * Extract schema from database using connection string
 */
export async function extractSchemaFromConnection(connectionString) {
    const connInfo = parseConnectionString(connectionString);

    if (!connInfo) {
        throw new Error('Invalid connection string format');
    }

    switch (connInfo.databaseType) {
        case 'postgresql':
        case 'cockroachdb':
            return await extractPostgresSchema(connInfo);
        case 'mysql':
        case 'mariadb':
            return await extractMySQLSchema(connInfo);
        case 'sqlserver':
            return await extractSQLServerSchema(connInfo);
        default:
            throw new Error(
                `Database type ${connInfo.databaseType} is not supported for automatic extraction yet`
            );
    }
}

/**
 * Extract PostgreSQL schema
 */
async function extractPostgresSchema(connInfo) {
    console.log('Connecting to PostgreSQL with:', {
        host: connInfo.host,
        port: connInfo.port,
        database: connInfo.database,
        user: connInfo.user,
        ssl: connInfo.ssl
    });

    const client = new PgClient({
        host: connInfo.host,
        port: connInfo.port,
        database: connInfo.database,
        user: connInfo.user,
        password: connInfo.password,
        ssl: connInfo.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
    });

    try {
        console.log('Attempting to connect...');
        await client.connect();
        console.log('Connected successfully! Running query...');
        
        const query = getPostgresQuery();
        const result = await client.query(query);
        console.log('Query executed successfully!');

        // The query returns a JSON string in the first row, first column
        const jsonData =
            result.rows[0]?.metadata_json_to_import ||
            result.rows[0]?.json_build_object;

        if (!jsonData) {
            throw new Error('No schema data returned from database');
        }

        return typeof jsonData === 'string'
            ? JSON.parse(jsonData)
            : jsonData;
    } catch (error) {
        console.error('PostgreSQL connection error:', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            hint: error.hint
        });
        throw error;
    } finally {
        await client.end();
    }
}

/**
 * Extract MySQL/MariaDB schema
 */
async function extractMySQLSchema(connInfo) {
    const connection = await mysql.createConnection({
        host: connInfo.host,
        port: connInfo.port,
        database: connInfo.database,
        user: connInfo.user,
        password: connInfo.password,
        ssl: connInfo.ssl ? {} : false,
    });

    try {
        const query = getMySQLQuery();
        const [rows] = await connection.execute(query);

        const jsonData = rows[0]?.metadata_json_to_import;

        if (!jsonData) {
            throw new Error('No schema data returned from database');
        }

        return typeof jsonData === 'string'
            ? JSON.parse(jsonData)
            : jsonData;
    } finally {
        await connection.end();
    }
}

/**
 * Extract SQL Server schema
 */
async function extractSQLServerSchema(connInfo) {
    // SQL Server requires tedious or mssql package
    throw new Error(
        'SQL Server automatic extraction not yet implemented. Please use manual query method.'
    );
}
