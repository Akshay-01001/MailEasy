import {
    pgTable,
    pgEnum,
    uuid,
    varchar,
    boolean,
    timestamp,
    uniqueIndex,
    check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const authProviderEnum = pgEnum('auth_provider', [
    'credentials',
    'google',
]);

export const users = pgTable(
    'users',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        name: varchar('name', { length: 100 }).notNull(),
        email: varchar('email', { length: 255 }).notNull().unique(),
        password: varchar('password', { length: 255 }),
        authProvider: authProviderEnum('auth_provider').notNull(),
        providerId: varchar('provider_id', { length: 255 }),
        isVerified: boolean('is_verified').notNull().default(false),
        timezone: varchar('timezone', { length: 100 }).notNull().default('UTC'),
        createdAt: timestamp('created_at', {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        uniqueIndex('users_google_provider_id_unique')
            .on(table.providerId)
            .where(sql`${table.authProvider} = 'google'`),

        check(
            'users_auth_provider_fields_check',
            sql`(
        ${table.authProvider} = 'credentials'
        AND ${table.password} IS NOT NULL
        AND ${table.providerId} IS NULL
      ) OR (
        ${table.authProvider} = 'google'
        AND ${table.password} IS NULL
        AND ${table.providerId} IS NOT NULL
        AND ${table.isVerified} = true
      )`,
        ),
    ],
);
