import { DatabaseType } from '@/lib/domain/database-type';

export interface ConnectionStringInfo {
    host: string;
    port: number;
    database: string;
    user?: string;
    password?: string;
    schema?: string;
    ssl?: boolean;
    databaseType: DatabaseType;
}

/**
 * Parse a connection string and extract connection details
 * Supports various formats:
 * - postgresql://user:password@host:port/database
 * - mysql://user:password@host:port/database
 * - Server=host;Database=database;User Id=user;Password=password (SQL Server)
 * - mongodb://user:password@host:port/database
 */
export function parseConnectionString(
    connectionString: string
): ConnectionStringInfo | null {
    try {
        // PostgreSQL/MySQL/SQLite format: protocol://user:password@host:port/database
        const urlMatch = connectionString.match(
            /^(postgres|postgresql|mysql|mariadb|mongodb|cockroachdb):\/\/(?:([^:]+):([^@]+)@)?([^:/]+)(?::(\d+))?\/([^?]+)(\?.*)?$/i
        );

        if (urlMatch) {
            const [, protocol, user, password, host, port, database, params] =
                urlMatch;

            let databaseType: DatabaseType;
            switch (protocol.toLowerCase()) {
                case 'postgres':
                case 'postgresql':
                    databaseType = DatabaseType.POSTGRESQL;
                    break;
                case 'mysql':
                    databaseType = DatabaseType.MYSQL;
                    break;
                case 'mariadb':
                    databaseType = DatabaseType.MARIADB;
                    break;
                case 'mongodb':
                    return null; // MongoDB not supported
                case 'cockroachdb':
                    databaseType = DatabaseType.COCKROACHDB;
                    break;
                default:
                    return null;
            }

            // Parse query parameters for additional options
            const queryParams = new URLSearchParams(params || '');
            const schema = queryParams.get('schema') || undefined;
            const ssl = queryParams.has('ssl')
                ? queryParams.get('ssl') === 'true'
                : queryParams.has('sslmode');

            return {
                host,
                port: port ? parseInt(port, 10) : getDefaultPort(databaseType),
                database,
                user: user || undefined,
                password: password || undefined,
                schema,
                ssl,
                databaseType,
            };
        }

        // SQL Server format: Server=host;Database=database;User Id=user;Password=password
        const sqlServerMatch = connectionString.match(
            /Server=([^;]+);(?:.*?Database=([^;]+))?(?:.*?User Id=([^;]+))?(?:.*?Password=([^;]+))?/i
        );

        if (sqlServerMatch) {
            const [, host, database, user, password] = sqlServerMatch;

            // Extract port from host if present (format: host,port or host:port)
            const hostParts = host.split(/[,:]/);
            const actualHost = hostParts[0];
            const port = hostParts[1]
                ? parseInt(hostParts[1], 10)
                : getDefaultPort(DatabaseType.SQL_SERVER);

            return {
                host: actualHost,
                port,
                database: database || '',
                user: user || undefined,
                password: password || undefined,
                databaseType: DatabaseType.SQL_SERVER,
            };
        }

        // Oracle format: user/password@host:port/service_name
        const oracleMatch = connectionString.match(
            /^(?:([^/]+)\/([^@]+)@)?([^:/]+)(?::(\d+))?\/([^?]+)$/
        );

        if (oracleMatch && !urlMatch) {
            const [, user, password, host, port, database] = oracleMatch;

            return {
                host,
                port: port ? parseInt(port, 10) : 1521,
                database,
                user: user || undefined,
                password: password || undefined,
                databaseType: DatabaseType.ORACLE,
            };
        }

        // ClickHouse format: clickhouse://user:password@host:port/database
        const clickhouseMatch = connectionString.match(
            /^clickhouse:\/\/(?:([^:]+):([^@]+)@)?([^:/]+)(?::(\d+))?\/([^?]+)(\?.*)?$/i
        );

        if (clickhouseMatch) {
            const [, user, password, host, port, database] = clickhouseMatch;

            return {
                host,
                port: port ? parseInt(port, 10) : 8123,
                database,
                user: user || undefined,
                password: password || undefined,
                databaseType: DatabaseType.CLICKHOUSE,
            };
        }

        return null;
    } catch (error) {
        console.error('Error parsing connection string:', error);
        return null;
    }
}

/**
 * Get default port for a database type
 */
function getDefaultPort(databaseType: DatabaseType): number {
    switch (databaseType) {
        case DatabaseType.POSTGRESQL:
        case DatabaseType.COCKROACHDB:
            return 5432;
        case DatabaseType.MYSQL:
        case DatabaseType.MARIADB:
            return 3306;
        case DatabaseType.SQL_SERVER:
            return 1433;
        case DatabaseType.ORACLE:
            return 1521;
        case DatabaseType.CLICKHOUSE:
            return 8123;
        case DatabaseType.SQLITE:
            return 0; // SQLite doesn't use network ports
        default:
            return 0;
    }
}

/**
 * Generate a safe connection string (password masked)
 */
export function maskConnectionString(connectionString: string): string {
    return connectionString.replace(
        /(:\/\/[^:]+:)([^@]+)(@)/,
        '$1****$3'
    ).replace(
        /(Password=)([^;]+)/gi,
        '$1****'
    );
}

/**
 * Validate connection string format
 */
export function validateConnectionString(connectionString: string): {
    isValid: boolean;
    error?: string;
} {
    if (!connectionString.trim()) {
        return { isValid: false, error: 'Connection string cannot be empty' };
    }

    const parsed = parseConnectionString(connectionString);

    if (!parsed) {
        return {
            isValid: false,
            error: 'Invalid connection string format. Please check the format for your database type.',
        };
    }

    if (!parsed.host) {
        return { isValid: false, error: 'Host is required' };
    }

    if (!parsed.database) {
        return { isValid: false, error: 'Database name is required' };
    }

    return { isValid: true };
}

/**
 * Generate example connection strings for each database type
 */
export function getConnectionStringExample(
    databaseType: DatabaseType
): string {
    switch (databaseType) {
        case DatabaseType.POSTGRESQL:
            return 'postgresql://user:password@localhost:5432/mydb';
        case DatabaseType.MYSQL:
            return 'mysql://user:password@localhost:3306/mydb';
        case DatabaseType.MARIADB:
            return 'mariadb://user:password@localhost:3306/mydb';
        case DatabaseType.SQL_SERVER:
            return 'Server=localhost;Database=mydb;User Id=sa;Password=yourpassword';
        case DatabaseType.SQLITE:
            return 'file:///path/to/database.db';
        case DatabaseType.CLICKHOUSE:
            return 'clickhouse://user:password@localhost:8123/mydb';
        case DatabaseType.COCKROACHDB:
            return 'cockroachdb://user:password@localhost:26257/mydb';
        case DatabaseType.ORACLE:
            return 'user/password@localhost:1521/ORCL';
        default:
            return '';
    }
}
