import type { DatabaseObjectResponse } from '@notionhq/client/build/src/api-endpoints';

type PropertyType = DatabaseObjectResponse['properties'][string]['type'];

const NOTION_TO_PG: Record<PropertyType, string> = {
  title: 'TEXT',
  rich_text: 'TEXT',
  number: 'NUMERIC',
  select: 'TEXT',
  multi_select: 'TEXT[]',
  date: 'TIMESTAMPTZ',
  checkbox: 'BOOLEAN',
  url: 'TEXT',
  email: 'TEXT',
  phone_number: 'TEXT',
  formula: 'JSONB',
  relation: 'TEXT[]',
  rollup: 'JSONB',
  people: 'JSONB',
  files: 'JSONB',
  created_time: 'TIMESTAMPTZ',
  last_edited_time: 'TIMESTAMPTZ',
  created_by: 'JSONB',
  last_edited_by: 'JSONB',
  status: 'TEXT',
  unique_id: 'TEXT',
  button: 'JSONB',
  verification: 'JSONB',
};

export interface MappedSchema {
  tableName: string;
  notionDatabaseId: string;
  columns: Array<{ name: string; type: string; notionType: PropertyType }>;
  createTableSQL: string;
}

export function mapNotionSchemaToPostgres(db: DatabaseObjectResponse): MappedSchema {
  const rawTitle = db.title?.[0]?.plain_text ?? db.id;
  const tableName = rawTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  const columns: MappedSchema['columns'] = [
    { name: 'notion_id', type: 'TEXT PRIMARY KEY', notionType: 'title' },
    { name: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()', notionType: 'created_time' },
    { name: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()', notionType: 'last_edited_time' },
    { name: 'sync_hash', type: 'TEXT', notionType: 'rich_text' },
    { name: 'raw_data', type: 'JSONB', notionType: 'formula' },
  ];

  for (const [propName, prop] of Object.entries(db.properties)) {
    if (['title', 'Created time', 'Last edited time'].includes(propName)) continue;
    const pgType = NOTION_TO_PG[prop.type] ?? 'JSONB';
    const colName = propName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    columns.push({ name: colName, type: pgType, notionType: prop.type });
  }

  const colDefs = columns.map((c) => `  ${c.name} ${c.type}`).join(',\n');
  const createTableSQL = `
CREATE TABLE IF NOT EXISTS ${tableName} (
${colDefs}
);

CREATE INDEX IF NOT EXISTS ${tableName}_updated_at_idx ON ${tableName} (updated_at);
`.trim();

  return { tableName, notionDatabaseId: db.id, columns, createTableSQL };
}
