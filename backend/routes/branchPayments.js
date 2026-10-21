const express = require('express');
const router = express.Router();
const BranchPayment = require('../models/BranchPayment');

// Get all payments
router.get('/', async (req, res) => {
  try {
    const { branch } = req.query;
    const filter = branch ? { branch } : {};
    const payments = await BranchPayment.find(filter).sort({ paymentDate: -1 });
    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    res.json({ payments, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add payment
router.post('/', async (req, res) => {
  try {
    const payment = new BranchPayment(req.body);
    await payment.save();
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete payment
router.delete('/:id', async (req, res) => {
  try {
    await BranchPayment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
