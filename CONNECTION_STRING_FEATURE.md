# Connection String Import Feature

## Overview

This feature enables ChartDB to automatically extract database schema information using connection strings. Users can input their database connection string, and the system will:

1. Parse and validate the connection string
2. Extract connection details (host, port, database, user, etc.)
3. Generate the appropriate metadata extraction query for that database type
4. Display instructions for running the query and importing results

## Features

### 1. Connection String Parser (`src/lib/connection-string/connection-string-parser.ts`)

A comprehensive utility that:
- Parses various connection string formats for different databases
- Validates connection string structure
- Extracts connection parameters (host, port, database, user, password, schema, SSL)
- Masks passwords for secure display
- Provides connection string examples for each database type

**Supported Connection String Formats:**

- **PostgreSQL/CockroachDB**: `postgresql://user:password@localhost:5432/mydb`
- **MySQL/MariaDB**: `mysql://user:password@localhost:3306/mydb`
- **SQL Server**: `Server=localhost;Database=mydb;User Id=sa;Password=yourpassword`
- **Oracle**: `user/password@localhost:1521/ORCL`
- **ClickHouse**: `clickhouse://user:password@localhost:8123/mydb`

### 2. Connection Instructions UI (`src/dialogs/common/import-database/instructions-section/instructions/connection-instructions.tsx`)

A React component that provides:
- Input field for connection strings with show/hide password toggle
- Real-time connection string validation
- Display of parsed connection details
- Auto-generated SQL query for schema extraction
- Copy-to-clipboard functionality
- Format reference guide

### 3. Import Method Integration

The feature integrates seamlessly with the existing import workflow:
- Added `'connection'` as a new `ImportMethod` type
- Updated the import method toggle UI to include "Connection String" option
- Integrated with existing validation and import flows

### 4. Auto-Detection

The system can automatically detect connection strings:
- Pattern matching for various database connection formats
- Validates parseability before confirming detection
- Integrated with existing import method detection system

## Usage

1. **Select Import Method**: Click on "Connection String" in the import dialog
2. **Enter Connection String**: Paste your database connection string
3. **Review Details**: Verify the parsed connection information
4. **Copy Query**: Copy the generated metadata extraction query
5. **Run Query**: Execute the query in your database client
6. **Import Results**: Paste the query results back into ChartDB

## Security

- **Client-Side Only**: All parsing happens in the browser
- **No Direct Connections**: ChartDB never directly connects to your database
- **Password Masking**: Passwords are masked in the UI by default
- **User Control**: Users explicitly run queries through their own database clients

## File Structure

```
src/
├── lib/
│   ├── connection-string/
│   │   └── connection-string-parser.ts     # Core parsing logic
│   ├── import-method/
│   │   ├── import-method.ts                # Type definitions (updated)
│   │   └── detect-import-method.ts         # Detection logic (updated)
│   ├── domain/
│   │   └── database-clients.ts             # Database client enums (updated)
│   └── data/
│       └── import-metadata/
│           └── scripts/
│               └── scripts.ts              # Script generation helper (updated)
└── dialogs/
    ├── common/
    │   └── import-database/
    │       ├── import-database.tsx          # Main import component (updated)
    │       └── instructions-section/
    │           ├── instructions-section.tsx # Instructions UI (updated)
    │           └── instructions/
    │               └── connection-instructions.tsx  # Connection UI (new)
    └── import-database-dialog/
        └── import-database-dialog.tsx       # Dialog wrapper (updated)
```

## Technical Details

### Connection String Parsing

The parser uses regex patterns to identify and extract components from various connection string formats:

```typescript
// Example: PostgreSQL
postgresql://user:password@host:5432/database

// Extracted:
{
    host: "host",
    port: 5432,
    database: "database",
    user: "user",
    password: "password",
    databaseType: DatabaseType.POSTGRESQL
}
```

### Query Generation

Once parsed, the system uses existing metadata extraction queries:
```typescript
const script = getImportMetadataScript(parsedInfo.databaseType, {
    databaseEdition,
    databaseClient: getDatabaseClient(parsedInfo.databaseType),
});
```

## Future Enhancements

Potential improvements for future versions:
1. Support for additional database types (MongoDB, Redis, etc.)
2. Connection string templates library
3. Connection testing (with user consent)
4. Save/manage multiple connection strings
5. Environment variable support
6. Azure, AWS, GCP connection string formats

## Testing

To test the feature:
1. Start the development server: `npm run dev`
2. Navigate to the import dialog
3. Select a database type
4. Choose "Connection String" import method
5. Test with various connection string formats

## Compatibility

- Works with all existing ChartDB database types
- Backward compatible with existing import methods
- No breaking changes to existing functionality
