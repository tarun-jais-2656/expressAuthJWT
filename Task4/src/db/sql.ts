/** Build a parameterised INSERT. Column names must already be on the allow-list. */
export const buildInsert = (
  table: string,
  allowed: readonly string[],
  data: object,
): { text: string; values: unknown[] } => {
  const record = data as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) throw new Error(`No columns to insert into ${table}`);
  if (keys.some((key) => !allowed.includes(key))) throw new Error(`Unexpected column for ${table}`);

  const values = keys.map((key) => record[key]);
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
  return {
    text: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values,
  };
};

/** Build a parameterised UPDATE ... WHERE id = $n. Sets updated_at = NOW(). */
export const buildUpdate = (
  table: string,
  allowed: readonly string[],
  id: number,
  data: object,
): { text: string; values: unknown[] } => {
  const record = data as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) throw new Error(`No columns to update on ${table}`);
  if (keys.some((key) => !allowed.includes(key))) throw new Error(`Unexpected column for ${table}`);

  const assignments = keys.map((key, index) => `${key} = $${index + 1}`);
  assignments.push('updated_at = NOW()');
  const values = keys.map((key) => record[key]);
  values.push(id);
  return {
    text: `UPDATE ${table} SET ${assignments.join(', ')} WHERE id = $${keys.length + 1} RETURNING *`,
    values,
  };
};
