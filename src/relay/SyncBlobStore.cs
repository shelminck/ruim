using Microsoft.Data.Sqlite;
using System.Security.Cryptography;

namespace Ruim.Relay;

public enum SyncWriteOutcome
{
    Created,
    Updated,
    VersionConflict,
    Unauthorized,
}

public readonly record struct SyncWriteResult(SyncWriteOutcome Outcome, long CurrentVersion);

public enum SyncReadOutcome
{
    Found,
    NotFound,
    Unauthorized,
}

public readonly record struct SyncReadResult(SyncReadOutcome Outcome, long Version, byte[]? Blob);

/// <summary>
/// Blind opslag voor versleutelde sync-blobs, gepartitioneerd per (sync-id, partitie).
/// Zie docs/architecture/decisions/0004-sync-relay-protocol.md voor het protocolontwerp.
/// De relay ziet nooit het syncwachtwoord of de encryptiesleutel — alleen een
/// hash van het write-token en de opaque, al versleutelde blob.
/// </summary>
public sealed class SyncBlobStore
{
    private readonly string _connectionString;

    public SyncBlobStore(string dbPath)
    {
        _connectionString = $"Data Source={dbPath}";

        using var connection = OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS sync_blobs (
                sync_id TEXT NOT NULL,
                partition_key TEXT NOT NULL,
                version INTEGER NOT NULL,
                token_hash BLOB NOT NULL,
                blob BLOB NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (sync_id, partition_key)
            );
            """;
        command.ExecuteNonQuery();
    }

    public SyncWriteResult Write(string syncId, string partitionKey, long expectedVersion, byte[] tokenHash, byte[] blob)
    {
        using var connection = OpenConnection();
        using var transaction = connection.BeginTransaction();

        using var select = connection.CreateCommand();
        select.Transaction = transaction;
        select.CommandText = "SELECT version, token_hash FROM sync_blobs WHERE sync_id = $syncId AND partition_key = $partitionKey";
        select.Parameters.AddWithValue("$syncId", syncId);
        select.Parameters.AddWithValue("$partitionKey", partitionKey);

        long? storedVersion = null;
        byte[]? storedTokenHash = null;
        using (var reader = select.ExecuteReader())
        {
            if (reader.Read())
            {
                storedVersion = reader.GetInt64(0);
                storedTokenHash = (byte[])reader["token_hash"];
            }
        }

        var now = DateTimeOffset.UtcNow.ToString("O");

        if (storedVersion is null)
        {
            if (expectedVersion != 0)
            {
                return new SyncWriteResult(SyncWriteOutcome.VersionConflict, 0);
            }

            using var insert = connection.CreateCommand();
            insert.Transaction = transaction;
            insert.CommandText = """
                INSERT INTO sync_blobs (sync_id, partition_key, version, token_hash, blob, updated_at)
                VALUES ($syncId, $partitionKey, 1, $tokenHash, $blob, $updatedAt)
                """;
            insert.Parameters.AddWithValue("$syncId", syncId);
            insert.Parameters.AddWithValue("$partitionKey", partitionKey);
            insert.Parameters.AddWithValue("$tokenHash", tokenHash);
            insert.Parameters.AddWithValue("$blob", blob);
            insert.Parameters.AddWithValue("$updatedAt", now);
            insert.ExecuteNonQuery();

            transaction.Commit();
            return new SyncWriteResult(SyncWriteOutcome.Created, 1);
        }

        if (!CryptographicOperations.FixedTimeEquals(storedTokenHash!, tokenHash))
        {
            return new SyncWriteResult(SyncWriteOutcome.Unauthorized, storedVersion.Value);
        }

        if (storedVersion.Value != expectedVersion)
        {
            return new SyncWriteResult(SyncWriteOutcome.VersionConflict, storedVersion.Value);
        }

        var newVersion = storedVersion.Value + 1;

        using var update = connection.CreateCommand();
        update.Transaction = transaction;
        update.CommandText = """
            UPDATE sync_blobs SET version = $version, blob = $blob, updated_at = $updatedAt
            WHERE sync_id = $syncId AND partition_key = $partitionKey
            """;
        update.Parameters.AddWithValue("$version", newVersion);
        update.Parameters.AddWithValue("$blob", blob);
        update.Parameters.AddWithValue("$updatedAt", now);
        update.Parameters.AddWithValue("$syncId", syncId);
        update.Parameters.AddWithValue("$partitionKey", partitionKey);
        update.ExecuteNonQuery();

        transaction.Commit();
        return new SyncWriteResult(SyncWriteOutcome.Updated, newVersion);
    }

    public SyncReadResult Read(string syncId, string partitionKey, byte[] tokenHash)
    {
        using var connection = OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT version, token_hash, blob FROM sync_blobs WHERE sync_id = $syncId AND partition_key = $partitionKey";
        command.Parameters.AddWithValue("$syncId", syncId);
        command.Parameters.AddWithValue("$partitionKey", partitionKey);

        using var reader = command.ExecuteReader();
        if (!reader.Read())
        {
            return new SyncReadResult(SyncReadOutcome.NotFound, 0, null);
        }

        var version = reader.GetInt64(0);
        var storedTokenHash = (byte[])reader["token_hash"];

        if (!CryptographicOperations.FixedTimeEquals(storedTokenHash, tokenHash))
        {
            return new SyncReadResult(SyncReadOutcome.Unauthorized, version, null);
        }

        var blob = (byte[])reader["blob"];
        return new SyncReadResult(SyncReadOutcome.Found, version, blob);
    }

    private SqliteConnection OpenConnection()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();
        return connection;
    }
}
