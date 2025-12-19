import React, { useState, useEffect } from 'react';
import { DatabaseType } from '@/lib/domain/database-type';
import type { DatabaseEdition } from '@/lib/domain/database-edition';
import { Input } from '@/components/input/input';
import { Label } from '@/components/label/label';
import { CodeSnippet } from '@/components/code-snippet/code-snippet';
import { Button } from '@/components/button/button';
import { Copy, Eye, EyeOff } from 'lucide-react';
import {
    parseConnectionString,
    validateConnectionString,
    getConnectionStringExample,
    maskConnectionString,
    type ConnectionStringInfo,
} from '@/lib/connection-string/connection-string-parser';
import { getImportMetadataScript } from '@/lib/data/import-metadata/scripts/scripts';
import { DatabaseClient } from '@/lib/domain/database-clients';

export interface ConnectionInstructionsProps {
    databaseType: DatabaseType;
    databaseEdition?: DatabaseEdition;
    connectionString?: string;
    onConnectionStringChange?: (connectionString: string) => void;
    onSchemaExtracted?: (schemaData: string) => void;
}

export const ConnectionInstructions: React.FC<
    ConnectionInstructionsProps
> = ({
    databaseType,
    databaseEdition,
    connectionString = '',
    onConnectionStringChange,
    onSchemaExtracted,
}) => {
    const [localConnectionString, setLocalConnectionString] =
        useState(connectionString);
    const [showPassword, setShowPassword] = useState(false);
    const [validationError, setValidationError] = useState<string>('');
    const [connectionInfo, setConnectionInfo] =
        useState<ConnectionStringInfo | null>(null);
    const [generatedScript, setGeneratedScript] = useState<string>('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [extractionStatus, setExtractionStatus] = useState<string>('');

    useEffect(() => {
        setLocalConnectionString(connectionString);
    }, [connectionString]);

    useEffect(() => {
        if (!localConnectionString.trim()) {
            setValidationError('');
            setConnectionInfo(null);
            setGeneratedScript('');
            setExtractionStatus('');
            return;
        }

        const validation = validateConnectionString(localConnectionString);
        if (!validation.isValid) {
            setValidationError(validation.error || 'Invalid connection string');
            setConnectionInfo(null);
            setGeneratedScript('');
            setExtractionStatus('');
            return;
        }

        setValidationError('');
        const parsed = parseConnectionString(localConnectionString);
        setConnectionInfo(parsed);

        // Automatically extract schema
        if (parsed) {
            extractSchema(localConnectionString);
        }

        if (onConnectionStringChange) {
            onConnectionStringChange(localConnectionString);
        }
    }, [
        localConnectionString,
        databaseType,
        databaseEdition,
        onConnectionStringChange,
    ]);

    const extractSchema = async (connString: string) => {
        setIsConnecting(true);
        setExtractionStatus('Connecting to database...');

        try {
            const response = await fetch('http://localhost:3002/api/extract-schema', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    connectionString: connString,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                const errorMessage = error.details 
                    ? `${error.error} (${error.details})`
                    : error.error || 'Failed to extract schema';
                throw new Error(errorMessage);
            }

            const schemaData = await response.json();
            setExtractionStatus('Schema extracted successfully!');

            // Set the extracted data in the parent component
            if (onSchemaExtracted) {
                onSchemaExtracted(JSON.stringify(schemaData, null, 2));
            }

            // Generate fallback script in case user needs it
            const script = getImportMetadataScript(connectionInfo!.databaseType, {
                databaseEdition,
                databaseClient: getDatabaseClient(connectionInfo!.databaseType),
            });
            setGeneratedScript(script);
        } catch (error: any) {
            setExtractionStatus('');
            
            // Check if it's a network error (server not running)
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                setValidationError(
                    'Cannot connect to ChartDB backend server. Please make sure the server is running on http://localhost:3002'
                );
            } else {
                setValidationError(
                    error.message || 'Failed to connect to database'
                );
            }

            // Generate manual script as fallback
            if (connectionInfo) {
                const script = getImportMetadataScript(connectionInfo.databaseType, {
                    databaseEdition,
                    databaseClient: getDatabaseClient(connectionInfo.databaseType),
                });
                setGeneratedScript(script);
            }
        } finally {
            setIsConnecting(false);
        }
    };

    const handleCopyScript = () => {
        navigator.clipboard.writeText(generatedScript);
    };

    const displayConnectionString = showPassword
        ? localConnectionString
        : maskConnectionString(localConnectionString);

    return (
        <div className="flex flex-col gap-4 text-sm text-primary">
            <div className="flex flex-col gap-2">
                <div className="text-base font-semibold">
                    Connect to Your Database
                </div>
                <div className="text-muted-foreground">
                    Enter your database connection string to automatically
                    extract the schema and create your diagram.
                </div>
                {isConnecting && (
                    <div className="flex items-center gap-2 rounded-md bg-blue-50 p-2 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-700 border-t-transparent dark:border-blue-300" />
                        {extractionStatus}
                    </div>
                )}
                {!isConnecting && extractionStatus && (
                    <div className="rounded-md bg-green-50 p-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
                        ✓ {extractionStatus}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="connection-string">Connection String</Label>
                <div className="relative">
                    <Input
                        id="connection-string"
                        type="text"
                        value={displayConnectionString}
                        onChange={(e) => setLocalConnectionString(e.target.value)}
                        placeholder={getConnectionStringExample(databaseType)}
                        className={`pr-10 ${validationError ? 'border-red-500' : ''}`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                </div>
                {validationError && (
                    <p className="text-sm text-red-500">{validationError}</p>
                )}
            </div>

            {connectionInfo && (
                <div className="flex flex-col gap-2 rounded-md border p-3">
                    <div className="text-sm font-medium">Connection Details</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <span className="text-muted-foreground">Host:</span>{' '}
                            <span className="font-medium">
                                {connectionInfo.host}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Port:</span>{' '}
                            <span className="font-medium">
                                {connectionInfo.port}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                Database:
                            </span>{' '}
                            <span className="font-medium">
                                {connectionInfo.database}
                            </span>
                        </div>
                        {connectionInfo.user && (
                            <div>
                                <span className="text-muted-foreground">
                                    User:
                                </span>{' '}
                                <span className="font-medium">
                                    {connectionInfo.user}
                                </span>
                            </div>
                        )}
                        {connectionInfo.schema && (
                            <div>
                                <span className="text-muted-foreground">
                                    Schema:
                                </span>{' '}
                                <span className="font-medium">
                                    {connectionInfo.schema}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {generatedScript && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <Label>Run This Query to Extract Schema</Label>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyScript}
                        >
                            <Copy className="mr-1 h-3 w-3" />
                            Copy
                        </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        For security reasons, ChartDB cannot connect directly to
                        your database. Please run this query using your
                        database client and paste the result below.
                    </div>
                    <CodeSnippet
                        code={generatedScript}
                        language="sql"
                        className="max-h-96"
                    />
                </div>
            )}

            <div className="flex flex-col gap-2 rounded-md bg-muted/50 p-3">
                <div className="text-sm font-medium">
                    📌 Connection String Formats
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                    <div>
                        <strong>PostgreSQL:</strong>{' '}
                        <code className="rounded bg-muted px-1 py-0.5">
                            postgresql://user:pass@host:5432/db
                        </code>
                    </div>
                    <div>
                        <strong>MySQL:</strong>{' '}
                        <code className="rounded bg-muted px-1 py-0.5">
                            mysql://user:pass@host:3306/db
                        </code>
                    </div>
                    <div>
                        <strong>SQL Server:</strong>{' '}
                        <code className="rounded bg-muted px-1 py-0.5">
                            Server=host;Database=db;User Id=user;Password=pass
                        </code>
                    </div>
                    <div>
                        <strong>Oracle:</strong>{' '}
                        <code className="rounded bg-muted px-1 py-0.5">
                            user/pass@host:1521/service
                        </code>
                    </div>
                </div>
            </div>
        </div>
    );
};

function getDatabaseClient(
    databaseType: DatabaseType
): DatabaseClient | undefined {
    switch (databaseType) {
        case DatabaseType.POSTGRESQL:
        case DatabaseType.COCKROACHDB:
            return DatabaseClient.POSTGRESQL_PSQL;
        case DatabaseType.MYSQL:
        case DatabaseType.MARIADB:
            return DatabaseClient.MYSQL_CLI;
        case DatabaseType.SQL_SERVER:
            return DatabaseClient.SQLCMD;
        default:
            return undefined;
    }
}
