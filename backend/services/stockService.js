const BOOK_TYPES = {
  bilty_book: { name: 'Bilty Book (BTC)', documentType: 'bilty' },
  bill_book: { name: 'Bill Book', documentType: 'billing' },
  mr_book: { name: 'MR Book (Money Receipt)', documentType: 'mr' },
  challan_book: { name: 'Gadi Challan Book', documentType: 'gadi_challan' },
  lr_copy_book: { name: 'LR Copy Book', documentType: 'lr_copy' }
};

async function useStock(client, type, documentNumber, user, branchId) {
  const book = BOOK_TYPES[type];
  if (!book) throw new Error(`Unknown document stock type: ${type}`);

  const updated = await client.query(
    `UPDATE stock_items
     SET used_quantity = COALESCE(used_quantity, 0) + 1,
         remaining_quantity = GREATEST(COALESCE(total_quantity, 0) - COALESCE(used_quantity, 0) - 1, 0)
     WHERE item_type = $1 AND is_active = TRUE
     RETURNING id`,
    [type]
  );
  if (!updated.rows.length) throw new Error(`Stock book "${type}" has not been initialized.`);

  await client.query(
    `INSERT INTO stock_history (stock_item_id, action, document_number, used_by, date, branch_id)
     VALUES ($1, 'used', $2, $3, CURRENT_DATE, $4)`,
    [updated.rows[0].id, documentNumber, user || 'Unknown', branchId || null]
  );
}

module.exports = { BOOK_TYPES, useStock };
