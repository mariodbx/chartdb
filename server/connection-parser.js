/**
 * Parse connection string and extract connection details
 */
export function parseConnectionString(connectionString) {
    try {
        // PostgreSQL/MySQL/CockroachDB format
        const urlMatch = connectionString.match(
            /^(postgres|postgresql|mysql|mariadb|cockroachdb):\/\/(?:([^:]+):([^@]+)@)?([^:/]+)(?::(\d+))?\/([^?]+)(\?.*)?$/i
        );

        if (urlMatch) {
            const [, protocol, user, password, host, port, database, params] =
                urlMatch;

            let databaseType = protocol.toLowerCase();
            if (databaseType === 'postgres') databaseType = 'postgresql';

            const queryParams = new URLSearchParams(params || '');
            const ssl = queryParams.has('ssl')
                ? queryParams.get('ssl') === 'true'
                : queryParams.has('sslmode');

            return {
                host,
                port: port
                    ? parseInt(port, 10)
                    : getDefaultPort(databaseType),
                database,
                user: user || undefined,
                password: password || undefined,
                ssl,
                databaseType,
            };
        }

        // SQL Server format
        const sqlServerMatch = connectionString.match(
            /Server=([^;]+);(?:.*?Database=([^;]+))?(?:.*?User Id=([^;]+))?(?:.*?Password=([^;]+))?/i
        );

        if (sqlServerMatch) {
            const [, host, database, user, password] = sqlServerMatch;
            const hostParts = host.split(/[,:]/);
            const actualHost = hostParts[0];
            const port = hostParts[1] ? parseInt(hostParts[1], 10) : 1433;

            return {
                host: actualHost,
                port,
                database: database || '',
                user: user || undefined,
                password: password || undefined,
                databaseType: 'sqlserver',
            };
        }

        return null;
    } catch (error) {
        console.error('Error parsing connection string:', error);
        return null;
    }
}

function getDefaultPort(databaseType) {
    const ports = {
        postgresql: 5432,
        cockroachdb: 26257,
        mysql: 3306,
        mariadb: 3306,
        sqlserver: 1433,
    };
    return ports[databaseType] || 5432;
}
