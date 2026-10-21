const mongoose = require('mongoose');

const BranchPaymentSchema = new mongoose.Schema({
  branch: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  paymentDate: { type: Date, default: Date.now },
  paymentMode: { type: String, enum: ['Cash','UPI','Bank Transfer','Cheque','RTGS'], default: 'Cash' },
  reference: { type: String, default: '' },
  description: { type: String, default: '' },
  createdBy: { type: String, default: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.model('BranchPayment', BranchPaymentSchema);
